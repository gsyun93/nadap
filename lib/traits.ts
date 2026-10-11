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
  const lines = [`- 타고난 바탕: ${DAY_MASTER[saju.dayGan] ?? "정보 없음"}`];
  for (const e of ELEMENTS) {
    if (saju.elements[e] >= 3) lines.push(`- ${STRONG[e]}`);
    else if (saju.elements[e] === 0) lines.push(`- ${MISSING[e]}`);
  }
  return lines.join("\n");
}

/** MBTI 성향 풀이 */
export function mbtiTraits(mbti: { code: string; estimated: boolean } | null): string | null {
  if (!mbti) return null;
  const head = `- ${mbti.code} (${MBTI_NICK[mbti.code] ?? ""})${mbti.estimated ? ", 간단 질문 4개로 추정한 유형" : ""}`;
  return [head, ...mbti.code.split("").map((l) => `- ${MBTI_LETTER[l] ?? ""}`)].join("\n");
}
