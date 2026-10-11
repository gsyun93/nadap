// 프롬프트 템플릿 (기획서 8-4, 9번 그대로). 화면(캐시 키)과 서버(실제 호출)가 같은 함수를 쓴다.
import { AGES, FOCUS, MBTI_NICK, Q1, Q2, REL, TONES } from "./data";
import { questionLimits } from "./flow";
import { calcAge, calcSaju, type SajuResult } from "./saju";
import { mbtiTraits, sajuTraits, weakElement } from "./traits";
import type { Answer, Profile, QA } from "./types";

export function answerText(a: Answer, options: readonly string[]): string {
  return a.kind === "custom" ? a.text.trim() : (options[a.index] ?? "");
}

export function concernText(p: Profile): string {
  return answerText(p.q1, Q1);
}

export function mindText(p: Profile): string | null {
  if (!p.q2 || p.q1.kind !== "option") return null;
  return answerText(p.q2, Q2[p.q1.index]);
}

export function relText(p: Profile): string | null {
  return p.rel === null ? null : (REL[p.rel] ?? null);
}

export function mbtiText(p: Profile): string {
  if (!p.mbti) return "모름";
  const nick = MBTI_NICK[p.mbti.code] ?? "";
  return p.mbti.estimated ? `${p.mbti.code} (${nick}, 간단 질문 4개로 추정)` : `${p.mbti.code} (${nick})`;
}

export function ageText(p: Profile): string {
  if (p.birth) {
    try {
      return calcAge(calcSaju(p.birth).solar).text;
    } catch {
      return "모름";
    }
  }
  if (p.ageBand !== null) return AGES[p.ageBand] ?? "모름";
  return "모름";
}

export function sajuText(p: Profile): string {
  if (!p.birth) return "정보 없음 (건너뜀)";
  try {
    return calcSaju(p.birth).text;
  } catch {
    return "정보 없음 (건너뜀)";
  }
}

function userInfoBlock(p: Profile): string {
  const lines = [
    `- 성별: ${p.birth?.gender ?? "모름"}`,
    `- 나이: ${ageText(p)}`,
    `- MBTI: ${mbtiText(p)}`,
    `- 사주: ${sajuText(p)}`,
    `- 고민 영역: ${concernText(p)}`,
  ];
  const mind = mindText(p);
  if (mind) lines.push(`- 마음: ${mind}`);
  const rel = relText(p);
  if (rel) lines.push(`- 그 사람과의 관계: ${rel}`);
  return lines.join("\n");
}

/** 관계 고민에서 "그 사람"이 누구인지 (관계를 물은 경우엔 그 답, 아니면 마음 보기로 정함) */
const PARTNER_BY_MIND = ["좋아하는 사람", "만나고 있는 사람", null, "헤어진 사람"] as const;
export function partnerText(p: Profile): string | null {
  if (p.q1.kind !== "option" || p.q1.index !== 1) return null;
  const rel = relText(p);
  if (rel) return rel;
  if (p.q2?.kind === "option") return PARTNER_BY_MIND[p.q2.index] ?? null;
  return null;
}

function coreConcern(p: Profile): string {
  let s = concernText(p);
  const mind = mindText(p);
  if (mind) s += ` → ${mind}`;
  const partner = partnerText(p);
  if (partner) s += ` (상대: ${partner})`;
  return s;
}

/** 대화의 중심: 주인공과 다루는 대상을 고정한다 (곁가지로 새는 걸 막는 핵심) */
function centerBlock(p: Profile): string {
  const partner = partnerText(p);
  return `[대화의 중심] 주인공은 이 사람이고, 다루는 건 오직 위 핵심 고민이야.${
    partner ? ` 질문에 나오는 "그 사람"은 항상 핵심 고민 속 상대(${partner}) 한 명을 뜻해.` : ""
  } 다른 인물(친구, 가족, 동료 등)은 핵심 고민을 비추는 배경일 뿐, 질문의 주인공이 될 수 없어.`;
}

function qaLines(list: QA[]): string {
  return list.map((h) => `Q: ${h.question}\nA: ${h.answer}`).join("\n");
}

/** 맞춤 질문 생성 프롬프트. history = 지금까지의 맞춤 질문과 답 (최소 1개: 고정 첫 질문) */
export function buildQuestionPrompt(p: Profile, history: QA[]): string {
  const { min, max } = questionLimits(p);
  const n = history.length + 1;
  const prev = history[history.length - 1];
  const before = history.slice(0, -1);
  const covered = history.map((h) => h.focus).filter(Boolean);

  return `너는 고민 상담 앱 '나답'의 상담가야. 한 사람의 고민 하나를 끝까지 파고드는 대화를 하고 있어. 다음 질문 하나와 보기 4개를 만들어.

[이 사람의 핵심 고민] ${coreConcern(p)}
${centerBlock(p)}

[사용자 정보]
${userInfoBlock(p)}

[지금까지의 대화]
${before.length ? qaLines(before) : "(아직 없음)"}

[바로 직전 질문과 답]
${prev ? qaLines([prev]) : "(아직 없음)"}

[진행] 맞춤 질문 ${n}번째 (최소 ${min}개, 최대 ${max}개). 이미 다룬 측면: ${covered.length ? covered.join(", ") : "없음"}
참고할 측면 (모두 핵심 고민 안에서만): ${FOCUS.join(" / ")}

가장 중요한 규칙:
- 모든 질문은 반드시 핵심 고민과 직접 이어져야 해. 핵심 고민과 상관없는 일반적인 인생 질문은 금지.
- 질문의 대상은 이 사람 자신(마음·생각·행동)이거나, 핵심 고민 속 상대·상황과의 일이어야 해.
- 직전 답을 이어받아 그 답이 왜 그런지, 구체적으로 어떤 건지 한 단계 더 들어가. 직전 답에서 더 파고들 게 없을 때만 새 측면으로 넘어가고, 그때도 앞에서 나온 답과 연결해서 물어.
- 직전 답에 다른 사람(친구, 가족, 동료 등)이나 핵심과 다른 주제가 나오면, 그 사람·주제를 파고들지 마. 그게 핵심 고민에 어떤 영향을 주는지, 그때 이 사람 마음이 어떤지로 되돌려 물어.
  나쁜 예: (직전 답 "친구들은 헤어지라고 해") → "친구들이 왜 헤어지라고 생각하는 것 같아요?"
  좋은 예: (직전 답 "친구들은 헤어지라고 해") → "그 말을 들으면 그 사람에 대한 마음은 어때요?"
- 질문과 보기 모두, 대화에 아직 안 나온 새 인물이나 새 주제를 먼저 꺼내지 마.
- 질문만 읽어도 이 사람의 고민과 이전 답을 기억하고 있다는 게 느껴지게 해. 예: 앞에서 '1년 넘게 미뤘다'고 했다면 '1년 동안 미루게 만든 건 뭐였어요?'처럼.

형식 규칙:
- question: 말 거는 해요체, 반드시 30자 이내(띄어쓰기 포함). 한 문장에 한 가지만 물어. 쉼표로 앞 내용을 길게 요약하거나 "혹시 ~인 건 아닐까요?"처럼 늘이지 마. 앞에서 물은 걸 반복하지 마.
  좋은 예: "1년 동안 미루게 만든 건 뭐였어요?" (18자)
  나쁜 예: "시간을 통제하는 연습은 직장 생활과 충돌할 수 있는데, 가장 먼저 줄이고 싶은 건 무엇인가요?" (너무 김)
- options: 이 사람이 속으로 할 법한 반말 혼잣말 4개, 반드시 각 22자 이내(띄어쓰기 포함), 짧은 말투로, 서로 겹치지 않게, 직전 답과 핵심 고민 맥락에 맞는 현실적인 내용.
- 나이대, 성별, MBTI 성향, 사주 기운은 보기 내용에 은근히만 반영. MBTI 유형명, 사주 용어, 따옴표, 이모지 금지.
- 판단하거나 훈계하는 말 금지.
- focus: 이번 질문이 다루는 측면을 짧게.
- last: ${min}번째 전에는 항상 false. ${min}번째부터는 매번 점검해서, 아래 중 대부분(4가지 이상)이 이미 대화에 나왔으면 true로 해.
  점검: ① 고민이 언제·어떻게 시작됐는지 ② 요즘 드는 감정 ③ 겉으로 말한 고민 밑의 진짜 이유 ④ 이 고민에 걸린 현실 조건 ⑤ 바라는 모습이나 원하는 방향 ⑥ 당장 할 수 있는 작은 변화
  질문을 오래 끄는 것보다 충분히 알았을 때 마치는 게 이 사람에게 좋아. ${max}번째에 가까울수록 더 적극적으로 true를 골라. 마지막 질문(last가 true)은 정리하는 느낌으로, 바라는 모습이나 작은 변화를 묻는 질문이면 좋아.

답하기 전에 question과 options의 글자 수를 직접 세어보고, 넘으면 줄여서 다시 써.

JSON만 답해: {"question":"...","options":["...","...","...","..."],"focus":"...","last":false}`;
}

/** 결과 생성 프롬프트. 사주·MBTI 성향 풀이(코드로 계산)를 함께 넘겨 네 카드 모두에 녹이게 한다 */
export function buildResultPrompt(p: Profile, history: QA[], tone: number): string {
  let saju: SajuResult | null = null;
  try {
    saju = p.birth ? calcSaju(p.birth) : null;
  } catch {
    saju = null;
  }
  const sajuPart = sajuTraits(saju);
  const mbtiPart = mbtiTraits(p.mbti);
  const weak = weakElement(saju);
  // 생년월일을 넣었으면 "이번 주 해볼 것" 3번은 사주에서 부족한 기운을 채우는 행동
  const todoGuide = weak
    ? `- 작고 구체적인 행동 + 이 사람의 어떤 기운·성향 때문에 맞는지 짧은 이유
- 작고 구체적인 행동 + 이 사람의 어떤 기운·성향 때문에 맞는지 짧은 이유
- ${weak.name} 기운을 곁에 두는 물리적 보완 + 이유
1·2번은 고민에 바로 쓰는 행동이야. 행동은 강한 기운·MBTI 강점을 살리는 쪽으로 골라.
3번은 딱 두 문장, 전체 80자 안팎으로 짧게. 첫 문장은 "${weak.name} 기운이 ${weak.missing ? "없어서" : "적어서"}"로 시작해 지금 고민에서 생기는 어려움을 짧게. 둘째 문장은 곁에 둘 물건 하나와 곁에 둘 사람 하나를 한 문장으로 권해 (예: "${weak.name} 기운이 ${weak.missing ? "없어서" : "적어서"} 첫발이 무거워요. 책상에 작은 화분을 두고, 끌어주는 활기찬 친구를 이번 주에 만나 보세요."). 이유나 설명 문장은 더 붙이지 마.
- 물건은 이 안에서 골라: ${weak.things}
- 사람은 이런 사람: ${weak.people}
- 운이 좋아진다는 식으로 단정하지 말고, 비싼 물건은 권하지 마. 3개만.`
    : `- 작고 구체적인 행동 + 이 사람의 어떤 성향 때문에 맞는지 짧은 이유
- 작고 구체적인 행동 + 이 사람의 어떤 성향 때문에 맞는지 짧은 이유
행동은 MBTI 강점을 살리는 쪽으로 골라. 2개만.`;

  return `너는 고민 상담 앱 '나답'의 상담가야. 아래 정보를 바탕으로 이 사람만을 위한 답을 써.

[사용자 정보]
${userInfoBlock(p)}

[성향 풀이 재료] (사주·MBTI를 미리 풀어둔 참고값. 이 안에서만 해석하고 새로 지어내지 마)
사주: ${sajuPart ? `
${sajuPart}` : "정보 없음"}
MBTI: ${mbtiPart ? `
${mbtiPart}` : "정보 없음"}

[질문과 답]
${qaLines(history)}

[원하는 말투] ${TONES[tone]?.instruction ?? TONES[0].instruction}

가장 중요한 원칙: 네 부분 모두 "고른 답"과 "타고난 성향(사주·MBTI)"을 엮어서 써. 답만 요약하면 안 되고, 이 사람의 성향 때문에 이 고민이 왜 이렇게 생겼는지, 그래서 이 사람에게는 어떤 방법이 맞는지까지 이어줘. 성향은 위 [성향 풀이 재료]에 있는 내용만 근거로 써.
반드시 지킬 것: "고민의 진짜 이유", "나답의 답", "이번 주 해볼 것" 세 부분 각각에 ① 사주 기운을 자연 말로 쓴 표현(예: 큰 산 같은, 흙 기운이 많아서, 나무 기운이 없어서)을 최소 한 번, ② MBTI 성향 표현(예: 마음을 먼저 살피는 성향, 혼자 있는 시간에 힘을 채우는 편)을 최소 한 번 넣어. 사주 정보가 없으면 ②만 지켜.
그리고 이 세 부분은 각각 마지막 줄에 "근거: "로 시작하는 줄을 따로 써서, 그 부분에서 엮은 성향을 짧은 말 2~3개로 " · "로 이어 적어 (예: 근거: 흙 기운이 많음 · 마음을 먼저 살핌). 각 말은 10자 안팎, [성향 풀이 재료]에 있는 것만.

형식: 아래 4개 제목을 정확히 이 순서로 쓰고, 다른 마크다운(굵게, 표, 다른 제목)은 쓰지 마.
## 나는 이런 사람
사주로 먼저 시작해. 타고난 바탕과 많거나 없는 기운을 자연 이야기로 쉽게 풀어줘(예: 단단한 흙 같은 사람, 물 기운이 적어서 쉬는 걸 잘 못해요). 그다음 MBTI 성향을 한 문장으로 이어. 마지막에 그 성향이 지금 고민과 어떻게 닿아 있는지 한 문장. 4문장 이내. 사주 정보가 없으면 MBTI와 나이대로만 써.
## 고민의 진짜 이유
고른 답들을 엮어 3~4문장. 사용자가 고른 표현을 자연스럽게 녹이되, 각 답 뒤에 있는 성향을 짚어줘(예: 참고 버틴다는 답 → 혼자 짊어지는 성향, 남의 이야기를 들어주는 게 좋았다는 답 → 마음을 먼저 살피는 성향). 성향 이야기는 최소 두 번 나와야 해.
## 나답의 답
이 사람의 성향을 담은 한 문장 결론을 쓰고, 그다음 줄에 근거 줄을 써. 누구에게나 할 수 있는 말이 아니라 이 성향이라서 하는 말이어야 해.
## 이번 주 해볼 것
${todoGuide}

규칙: 해요체. 초등학생도 한 번에 읽히게 문장은 짧게. 한자, 사주 용어(일간, 오행, 비겁, 시주 같은 말), 어려운 단어 금지. 기운은 나무·불·흙·쇠·물 같은 자연 말로만. MBTI 유형명(INFP 등)은 전체에서 한두 번만. 사주는 성향 참고로만 쓰고 운명을 단정하지 마. 의학적 진단 금지. 전화번호나 외부 기관 안내는 넣지 말고, 이 대화 안에서 위로와 방법을 충분히 줘.`;
}
