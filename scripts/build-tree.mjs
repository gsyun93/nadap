// 질문 트리 원본(JSON)을 갈래별 작은 파일로 나눈다: node scripts/build-tree.mjs <원본 경로>
// 결과: lib/tree/{W1..M4}.json  (화면에서 고른 갈래 하나만 불러 쓴다)
import fs from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("원본 트리 JSON 경로를 넘겨주세요");
const tree = JSON.parse(fs.readFileSync(src, "utf8"));

// 원본은 그대로 두고 앱에 넣는 복사본만 고치는 문구
const FIXES = [
  // R3(자꾸 서운하고 부딪혀)는 상대가 가족·직장 사람일 수도 있어 연인 전제 표현을 바꾼다
  { branch: "R3", from: "스킨십이나 몸짓", to: "몸짓이나 행동" },
];

for (const [key, b] of Object.entries(tree.branches)) {
  const nodes = {};
  for (const [id, n] of Object.entries(b.nodes)) {
    let options = n.options;
    for (const f of FIXES) if (f.branch === key) options = options.map((o) => (o === f.from ? f.to : o));
    nodes[id] = { q: n.question, o: options, n: n.step < 4 ? n.next : null };
  }
  fs.writeFileSync(`lib/tree/${key}.json`, JSON.stringify({ start: b.start, nodes }));
}
console.log("done:", Object.keys(tree.branches).join(", "));
