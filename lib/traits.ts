// 사주·MBTI를 결과 프롬프트용 쉬운 성향 설명으로 풀어준다 (코드로 정해진 풀이, AI가 지어내지 않게)
import { MBTI_NICK } from "./data";
import type { SajuResult } from "./saju";

type Element = "목" | "화" | "토" | "금" | "수";

/** 일간(태어난 날의 기운) → 자연 비유와 기본 성향 */
const DAY_MASTER: Record<string, string> = {
  甲: "곧게 위로 자라는 큰 나무. 곧고 추진력이 있으며 한번 정하면 밀고 나간다",
  乙: "어디서든 뿌리내리는 풀과 덩굴. 유연하고 적응력이 좋으며 사람 사이를 잘 엮는다",
  丙: "모두를 비추는 한낮의 해. 밝고 솔직하며 드러내고 표현할 때 힘이 난다",
  丁: "어둠을 밝히는 촛불. 섬세하고 따뜻하며 가까운 사람을 오래 챙긴다",
  戊: "묵직한 큰 산. 믿음직하고 잘 버티지만 쉽게 움직이지 않는다",
  己: "곡식을 키우는 논밭. 포용력이 있고 세심하게 남을 돌본다",
  庚: "단단한 바위와 쇠. 결단력과 원칙이 분명하고 맺고 끊는 게 확실하다",
  辛: "다듬어진 보석. 예민하고 기준이 높으며 스스로에게 엄격하다",
  壬: "넓게 흐르는 강과 바다. 생각이 크고 자유로우며 매이는 걸 답답해한다",
  癸: "조용히 스미는 비와 이슬. 감수성과 직관이 좋고 속으로 생각이 많다",
};

/** 기운이 많을 때 (3개 이상) */
const STRONG: Record<Element, string> = {
  목: "나무 기운이 많음: 일을 벌이고 앞으로 나가려는 힘이 크지만, 벌여놓고 지치기 쉽다",
  화: "불 기운이 많음: 열정과 감정 표현이 크지만, 쉽게 달아오르고 금방 소진된다",
  토: "흙 기운이 많음: 버티고 지키는 힘이 크지만, 변화가 느리고 혼자 짊어지려 한다",
  금: "쇠 기운이 많음: 기준이 분명하고 냉정하지만, 자신과 남에게 엄격해 숨이 막힐 수 있다",
  수: "물 기운이 많음: 생각이 깊고 넓지만, 걱정이 꼬리를 물고 결정이 늦어진다",
};

/** 기운이 없을 때 (0개) */
const MISSING: Record<Element, string> = {
  목: "나무 기운이 없음: 새로 시작하는 힘이 약해 첫발 떼기가 어렵다",
  화: "불 기운이 없음: 속마음을 드러내고 표현하는 걸 어려워한다",
  토: "흙 기운이 없음: 중심을 잡고 버티기가 어려워 쉽게 흔들린다",
  금: "쇠 기운이 없음: 끊고 정리하는 걸 어려워해 거절과 마무리가 힘들다",
  수: "물 기운이 없음: 쉬고 흘려보내는 게 서툴러 긴장이 잘 안 풀린다",
};

const MBTI_LETTER: Record<string, string> = {
  E: "사람을 만나며 에너지를 채운다",
  I: "혼자 있는 시간에 에너지를 채운다",
  S: "눈앞의 사실과 경험을 믿는다",
  N: "가능성과 의미를 먼저 본다",
  T: "논리와 해결책으로 판단한다",
  F: "마음과 관계를 먼저 살핀다",
  J: "계획하고 정리해야 마음이 놓인다",
  P: "열어두고 그때그때 정하는 게 편하다",
};

const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

/** 사주 성향 풀이 (사주 정보가 없으면 null) */
export function sajuTraits(saju: SajuResult | null): string | null {
  if (!saju) return null;
  const el = saju.elements;
  const lines = [`- 타고난 바탕: ${DAY_MASTER[saju.dayGan] ?? "정보 없음"}`];
  for (const e of ELEMENTS) {
    if (el[e] >= 3) lines.push(`- ${STRONG[e]}`);
    else if (el[e] === 0) lines.push(`- ${MISSING[e]}`);
  }
  // 뚜렷하게 많거나 없는 기운이 없어도, 가장 많은 기운과 가장 적은 기운은 항상 넘겨서 엮을 재료를 만든다
  const counts = ELEMENTS.map((e) => el[e]);
  const maxN = Math.max(...counts);
  const minN = Math.min(...counts);
  if (maxN < 3 && maxN > minN) {
    for (const e of ELEMENTS) if (el[e] === maxN) lines.push(`- (상대적으로) ${STRONG[e].replace("많음:", "비교적 많은 편:")}`);
  }
  if (minN > 0 && maxN > minN) {
    for (const e of ELEMENTS) if (el[e] === minN) lines.push(`- (상대적으로) ${MISSING[e].replace("없음:", "적은 편:")}`);
  }
  if (maxN === minN) lines.push("- 다섯 기운이 고르게 있음: 한쪽으로 치우치지 않아 상황에 맞춰 균형을 잡는 편이다");
  return lines.join("\n");
}

/** MBTI 성향 풀이 */
export function mbtiTraits(mbti: { code: string; estimated: boolean } | null): string | null {
  if (!mbti) return null;
  const head = `- ${mbti.code} (${MBTI_NICK[mbti.code] ?? ""})${mbti.estimated ? ", 간단 질문 4개로 추정한 유형" : ""}`;
  return [head, ...mbti.code.split("").map((l) => `- ${MBTI_LETTER[l] ?? ""}`)].join("\n");
}

// ── 로딩 화면 "성향 한 조각"용 해요체 문장 (AI 호출 없이 코드로) ──
const DAY_MASTER_TIP: Record<string, string> = {
  甲: "곧게 위로 자라는 큰 나무 같은 사람이에요. 한번 정하면 꾸준히 밀고 나가요.",
  乙: "어디서든 뿌리내리는 풀 같은 사람이에요. 유연하고 사람 사이를 잘 이어요.",
  丙: "한낮의 해 같은 사람이에요. 솔직하게 드러낼 때 힘이 나요.",
  丁: "어둠을 밝히는 촛불 같은 사람이에요. 가까운 사람을 오래 따뜻하게 챙겨요.",
  戊: "묵직한 큰 산 같은 사람이에요. 믿음직하게 버티지만 쉽게 움직이지는 않아요.",
  己: "곡식을 키우는 논밭 같은 사람이에요. 남을 세심하게 돌보는 편이에요.",
  庚: "단단한 바위 같은 사람이에요. 맺고 끊는 게 분명한 편이에요.",
  辛: "다듬어진 보석 같은 사람이에요. 기준이 높고 스스로에게 엄격한 편이에요.",
  壬: "넓게 흐르는 강 같은 사람이에요. 생각이 크고 매이는 걸 답답해해요.",
  癸: "조용히 스미는 비 같은 사람이에요. 감수성이 깊고 속으로 생각이 많아요.",
};
const STRONG_TIP: Record<Element, string> = {
  목: "나무 기운이 많아요. 일을 벌이는 힘이 큰 대신, 벌여놓고 지치기 쉬워요.",
  화: "불 기운이 많아요. 열정이 큰 대신, 금방 달아오르고 금방 지칠 수 있어요.",
  토: "흙 기운이 많아요. 버티는 힘이 큰 대신, 혼자 짊어지기 쉬워요.",
  금: "쇠 기운이 많아요. 기준이 분명한 대신, 자신에게 엄격해지기 쉬워요.",
  수: "물 기운이 많아요. 생각이 깊은 대신, 걱정이 꼬리를 물기 쉬워요.",
};
const MISSING_TIP: Record<Element, string> = {
  목: "나무 기운이 없어요. 새로 시작하는 첫발이 조금 무거울 수 있어요.",
  화: "불 기운이 없어요. 속마음을 드러내는 게 조금 어려울 수 있어요.",
  토: "흙 기운이 없어요. 중심을 잡고 버티는 게 조금 힘들 수 있어요.",
  금: "쇠 기운이 없어요. 거절하고 정리하는 게 조금 어려울 수 있어요.",
  수: "물 기운이 없어요. 쉬면서 흘려보내는 게 조금 서툴 수 있어요.",
};
const MBTI_TIP: Record<string, string> = {
  E: "사람을 만나면서 힘을 얻는 편이에요.",
  I: "혼자 있는 시간에 힘을 채우는 편이에요.",
  S: "눈앞의 사실과 경험을 믿는 편이에요.",
  N: "가능성과 의미를 먼저 보는 편이에요.",
  T: "논리와 해결책으로 판단하는 편이에요.",
  F: "마음과 관계를 먼저 살피는 편이에요.",
  J: "계획이 서야 마음이 놓이는 편이에요.",
  P: "계획을 열어두고 그때그때 정하는 편이에요.",
};

/** 로딩 화면에 하나씩 보여줄 성향 문장들 (사주 → MBTI 순) */
export function traitTips(saju: SajuResult | null, mbti: { code: string } | null): string[] {
  const tips: string[] = [];
  if (saju) {
    if (DAY_MASTER_TIP[saju.dayGan]) tips.push(DAY_MASTER_TIP[saju.dayGan]);
    for (const e of ELEMENTS) {
      if (saju.elements[e] >= 3) tips.push(STRONG_TIP[e]);
      else if (saju.elements[e] === 0) tips.push(MISSING_TIP[e]);
    }
  }
  if (mbti) for (const l of mbti.code.split("")) if (MBTI_TIP[l]) tips.push(MBTI_TIP[l]);
  return tips;
}
