// 질문 트리 2~4번째 질문의 보기를 대화체(반말 혼잣말)로 한 번 일괄 변환한다. (1회성, Claude Sonnet 사용)
//   node scripts/rewrite-tree-options.mjs <원본 트리 JSON 경로> [갈래들, 예: W1,R3]
// 결과: scripts/tree-option-rewrites.json  → build-tree.mjs가 이 파일을 적용해 lib/tree/를 만든다.
// 키는 .env.local의 RESULT_API_KEY(Anthropic)를 쓴다.
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const src = process.argv[2];
if (!src) throw new Error("원본 트리 JSON 경로를 넘겨주세요");
const tree = JSON.parse(fs.readFileSync(src, "utf8"));
const OUT = "scripts/tree-option-rewrites.json";
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const client = new Anthropic({
  apiKey: env.RESULT_API_KEY,
  ...(env.RESULT_WORKSPACE_ID ? { defaultHeaders: { "anthropic-workspace-id": env.RESULT_WORKSPACE_ID } } : {}),
});

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, options: { type: "array", items: { type: "string" } } },
        required: ["id", "options"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/** 검사: 4개, 5~22자, 따옴표·이모지·MBTI 유형명 없음, R3은 연인 전제 표현 없음 */
function ok(options, key) {
  return (
    Array.isArray(options) &&
    options.length === 4 &&
    new Set(options).size === 4 &&
    options.every(
      (o) =>
        typeof o === "string" &&
        o.length >= 5 &&
        o.length <= 22 &&
        !/["'“”‘’]|[\u{1F300}-\u{1FAFF}]|[EI][SN][TF][JP]/u.test(o) &&
        // R3은 상대가 가족·직장 사람일 수도 있어 연인 전제 표현 금지
        !(key === "R3" && /스킨십|데이트/.test(o)),
    )
  );
}

async function rewriteBranch(key, b, skip = {}) {
  const nodes = Object.entries(b.nodes).filter(([id, n]) => n.step >= 2 && !skip[id]);
  const lines = nodes.map(([id, n]) => `${id} | 직전 답: ${n.chosen} | 질문: ${n.question} | 보기: ${n.options.join(" / ")}`);
  const relNote =
    key === "R3"
      ? "\n- 이 갈래의 '그 사람'은 연인·친구·가족·직장 사람 중 누구일 수도 있어. 연인만 해당되는 표현(스킨십, 데이트 등)은 쓰지 마."
      : "";
  const prompt = `고민 상담 앱 '나답'의 질문 보기를 다듬는 일이야.
[핵심 고민] ${b.고민} → ${b.마음}

아래 각 줄은 "노드id | 직전 답 | 질문 | 보기 4개"야. 보기 4개를 모두, 이 사람이 질문을 듣고 속으로 할 법한 반말 혼잣말 대화체로 바꿔.

규칙:
- 뜻과 순서는 그대로 유지해. 보기끼리 서로 겹치지 않게.
- 단답(명사 하나, "~때", "~해서", "~것"으로 끊긴 조각)은 금지. 반드시 "~어/~야/~해/~돼/~거든/~것 같아"처럼 말이 끝나는 문장으로.
- 각 보기는 10~20자 정도 (띄어쓰기 포함, 최대 22자). 이미 자연스러운 대화체면 길이만 맞추고 거의 그대로 둬.
- 질문과 직전 답의 맥락에 자연스럽게 이어지게. 판단·훈계 금지. 따옴표, 이모지, MBTI 유형명 금지.${relNote}

예: "미래 계획" → "미래 계획이 자꾸 엇갈려", "외모" → "외모가 제일 신경 쓰여", "부담돼" → "그 말이 좀 부담돼"

${lines.join("\n")}

모든 노드를 빠짐없이, 같은 id로 답해.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-5-5",
    max_tokens: 32000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason !== "end_turn") console.log(`${key}: stop_reason=${msg.stop_reason}`, msg.stop_details ?? "");
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const items = JSON.parse(text).items;
  const out = {};
  let bad = 0;
  for (const [id] of nodes) {
    const it = items.find((x) => x.id === id);
    if (it && ok(it.options, key)) out[id] = it.options;
    else {
      bad++;
      if (bad <= 3) console.log(`  ${key} ${id} 탈락:`, it ? it.options.map((o) => `${o}(${o.length})`).join(" / ") : "응답 없음");
    }
  }
  console.log(`${key}: ${Object.keys(out).length}/${nodes.length} 변환, 규칙 위반으로 원문 유지 ${bad} (in=${msg.usage.input_tokens} out=${msg.usage.output_tokens})`);
  return out;
}

// 아직 변환 안 된 노드가 있는 갈래만 (이미 된 노드는 건너뛰고 빠진 노드만 다시)
const only = process.argv[3]?.split(",");
const missingOf = (k) =>
  Object.entries(tree.branches[k].nodes).filter(([id, n]) => n.step >= 2 && !done[k]?.[id]).length;
const keys = Object.keys(tree.branches).filter((k) => missingOf(k) > 0 && (!only || only.includes(k)));
for (let i = 0; i < keys.length; i += 4) {
  const chunk = keys.slice(i, i + 4);
  const results = await Promise.all(
    chunk.map((k) => rewriteBranch(k, tree.branches[k], done[k] ?? {}).catch((e) => (console.error(k, e.message), null))),
  );
  chunk.forEach((k, j) => results[j] && (done[k] = { ...(done[k] ?? {}), ...results[j] }));
  fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
}
console.log("저장:", OUT);
