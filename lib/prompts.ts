// 프롬프트 템플릿 (기획서 8-4, 9번 그대로). 화면(캐시 키)과 서버(실제 호출)가 같은 함수를 쓴다.
import { AGES, FOCUS, MBTI_NICK, Q1, Q2, REL, TONES } from "./data";
import { questionLimits } from "./flow";
import { calcAge, calcSaju } from "./saju";
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

function coreConcern(p: Profile): string {
  let s = concernText(p);
  const mind = mindText(p);
  if (mind) s += ` → ${mind}`;
  const rel = relText(p);
  if (rel) s += ` (상대: ${rel})`;
  return s;
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

[사용자 정보]
${userInfoBlock(p)}

[지금까지의 대화]
${before.length ? qaLines(before) : "(아직 없음)"}

[바로 직전 질문과 답]
${prev ? qaLines([prev]) : "(아직 없음)"}

[진행] 맞춤 질문 ${n}번째 (최소 ${min}개, 최대 ${max}개). 이미 다룬 측면: ${covered.length ? covered.join(", ") : "없음"}
참고할 측면: ${FOCUS.join(" / ")}

가장 중요한 규칙:
- 모든 질문은 반드시 핵심 고민과 직접 이어져야 해. 핵심 고민과 상관없는 일반적인 인생 질문은 금지.
- 직전 답을 이어받아 그 답이 왜 그런지, 구체적으로 어떤 건지 한 단계 더 들어가. 직전 답에서 더 파고들 게 없을 때만 새 측면으로 넘어가고, 그때도 앞에서 나온 답과 연결해서 물어.
- 질문만 읽어도 이 사람의 고민과 이전 답을 기억하고 있다는 게 느껴지게 해. 예: 앞에서 '1년 넘게 미뤘다'고 했다면 '1년 동안 미루게 만든 건 뭐였어요?'처럼.

형식 규칙:
- question: 말 거는 해요체, 30자 이내. 앞에서 물은 걸 반복하지 마.
- options: 이 사람이 속으로 할 법한 반말 혼잣말 4개, 각 22자 이내, 서로 겹치지 않게, 직전 답과 핵심 고민 맥락에 맞는 현실적인 내용.
- 나이대, 성별, MBTI 성향, 사주 기운은 보기 내용에 은근히만 반영. MBTI 유형명, 사주 용어, 따옴표, 이모지 금지.
- 판단하거나 훈계하는 말 금지.
- focus: 이번 질문이 다루는 측면을 짧게.
- last: 핵심 고민에 대해 충분히 파악됐으면 true. ${min}번째 전에는 항상 false.

JSON만 답해: {"question":"...","options":["...","...","...","..."],"focus":"...","last":false}`;
}

/** 결과 생성 프롬프트 */
export function buildResultPrompt(p: Profile, history: QA[], tone: number): string {
  return `너는 고민 상담 앱 '나답'의 상담가야. 아래 정보를 바탕으로 이 사람만을 위한 답을 써.

[사용자 정보]
${userInfoBlock(p)}

[질문과 답]
${qaLines(history)}

[원하는 말투] ${TONES[tone]?.instruction ?? TONES[0].instruction}

형식: 아래 4개 제목을 정확히 이 순서로 쓰고, 다른 마크다운(굵게, 표, 다른 제목)은 쓰지 마.
## 나는 이런 사람
사주로 먼저 시작해. 일간과 오행을 자연 이야기로 쉽게 풀어줘(예: 단단한 흙 같은 사람, 물 기운이 적어서 쉬는 걸 잘 못해요). 그다음 MBTI 성향을 한 문장으로 이어. 초등학생도 한 번에 읽히게: 한자, 사주 용어(일간, 오행, 비겁 같은 말), 어려운 단어 금지, 문장은 짧게, 3문장 이내. 사주 정보가 없으면 MBTI와 나이대로만 써.
## 고민의 진짜 이유
고른 답들을 엮어 3~4문장. 사용자가 고른 표현을 자연스럽게 녹여.
## 나답의 답
한 문장 결론.
## 이번 주 해볼 것
- 작고 구체적인 행동
- 작고 구체적인 행동

규칙: 해요체. 사주는 성향 참고로만 쓰고 운명을 단정하지 마. 의학적 진단 금지. 전화번호나 외부 기관 안내는 넣지 말고, 이 대화 안에서 위로와 방법을 충분히 줘.`;
}
