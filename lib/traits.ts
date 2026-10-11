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

// ── 이번 주 해볼 것 3번: 사주에서 부족한 기운 채우기 ──
const ELEMENT_NAME: Record<Element, string> = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };

/**
 * 부족한 기운을 곁에 두는 것으로 채우는 방향 (물건·색·공간 + 곁에 둘 사람).
 * 오행에서 흔히 쓰는 보완 방법이고, AI는 이 안에서 고른다.
 */
const BOOST_HINT: Record<Element, { things: string; people: string }> = {
  목: {
    things: "초록색 소품, 책상 위 작은 화분이나 식물, 나무 소재 물건(나무 컵·원목 소품), 창가처럼 해 드는 자리",
    people: "새로운 걸 같이 해보자고 끌어주는 활기찬 사람",
  },
  화: {
    things: "빨강·주황 소품, 따뜻한 조명이나 캔들, 햇볕 잘 드는 자리, 밝은 색 옷",
    people: "잘 웃고 감정 표현이 풍부한 밝은 사람",
  },
  토: {
    things: "노랑·베이지·갈색 소품, 도자기나 흙 소재 물건(머그잔·화분), 폭신한 쿠션이나 담요, 깔끔하게 정돈된 자리",
    people: "묵묵히 믿어주는 듬직하고 한결같은 사람",
  },
  금: {
    things: "흰색·은색 소품, 금속 물건(손목시계·은 액세서리), 칸이 나뉜 정리함, 군더더기 없는 책상",
    people: "결단력 있고 선을 분명하게 그어주는 사람, 냉정하게 조언해주는 사람",
  },
  수: {
    things: "검정·남색 소품, 물병이나 가습기·작은 수조처럼 물과 관련된 물건, 물가가 보이는 자리, 푸른 계열 침구",
    people: "차분하게 끝까지 들어주는 여유로운 사람",
  },
};

/** 가장 부족한 기운 (없는 기운이 있으면 그것, 아니면 가장 적은 기운). 사주 정보가 없으면 null */
export function weakElement(
  saju: SajuResult | null,
): { element: Element; name: string; missing: boolean; things: string; people: string } | null {
  if (!saju) return null;
  const min = Math.min(...ELEMENTS.map((e) => saju.elements[e]));
  const e = ELEMENTS.find((x) => saju.elements[x] === min)!;
  return { element: e, name: ELEMENT_NAME[e], missing: min === 0, ...BOOST_HINT[e] };
}
