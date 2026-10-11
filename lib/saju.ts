// 사주·나이 계산 (기획서 6, 7번). AI에게 맡기지 않고 코드로 계산한다.
import { Lunar, LunarMonth, Solar } from "lunar-javascript";
import { HOURS } from "./data";

export type Gender = "남자" | "여자";

export type BirthInput = {
  gender: Gender;
  calendar: "solar" | "lunar";
  year: number;
  month: number;
  day: number;
  leap: boolean; // 음력 윤달
  hourIndex: number | null; // HOURS 인덱스, null = 태어난 시간 모름
};

export type SajuResult = {
  pillars: { year: string; month: string; day: string; time: string | null }; // 한자 간지
  dayGan: string; // 일간 한자
  dayGanLabel: string; // 예: "무(토)"
  elements: Record<Element, number>;
  solar: { year: number; month: number; day: number };
  text: string; // AI에 넘기는 사주 문자열
};

type Element = "목" | "화" | "토" | "금" | "수";
const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

const STEMS: Record<string, [string, Element]> = {
  甲: ["갑", "목"], 乙: ["을", "목"], 丙: ["병", "화"], 丁: ["정", "화"], 戊: ["무", "토"],
  己: ["기", "토"], 庚: ["경", "금"], 辛: ["신", "금"], 壬: ["임", "수"], 癸: ["계", "수"],
};
const BRANCHES: Record<string, [string, Element]> = {
  子: ["자", "수"], 丑: ["축", "토"], 寅: ["인", "목"], 卯: ["묘", "목"], 辰: ["진", "토"], 巳: ["사", "화"],
  午: ["오", "화"], 未: ["미", "토"], 申: ["신", "금"], 酉: ["유", "금"], 戌: ["술", "토"], 亥: ["해", "수"],
};

/** 간지 한자 2글자 → 한글 2글자 (예: 癸酉 → 계유) */
export function ganjiToHangul(ganji: string): string {
  return (STEMS[ganji[0]]?.[0] ?? ganji[0]) + (BRANCHES[ganji[1]]?.[0] ?? ganji[1]);
}

export class BirthError extends Error {
  constructor(public kind: "solar" | "lunar") {
    super(kind);
  }
}

export const BIRTH_ERROR_TEXT = {
  solar: "날짜를 확인해주세요. 달력에 없는 날짜예요.",
  lunar: "날짜를 확인해주세요. 음력에 없는 날짜이거나 윤달이 아닐 수 있어요.",
} as const;

/** 입력한 생년월일을 양력 Solar로 바꾼다. 없는 날짜면 BirthError */
function toSolar(b: BirthInput, hour: number): Solar {
  if (b.calendar === "solar") {
    // 달력에 실제로 있는 날짜인지 먼저 확인 (lunar-javascript는 2월 30일도 그대로 받아줌)
    const d = new Date(Date.UTC(b.year, b.month - 1, b.day));
    if (d.getUTCFullYear() !== b.year || d.getUTCMonth() + 1 !== b.month || d.getUTCDate() !== b.day) {
      throw new BirthError("solar");
    }
    const solar = Solar.fromYmdHms(b.year, b.month, b.day, hour, 0, 0);
    if (solar.getMonth() !== b.month || solar.getDay() !== b.day) throw new BirthError("solar");
    return solar;
  }
  const m = b.leap ? -b.month : b.month;
  try {
    const lm = LunarMonth.fromYm(b.year, m);
    if (!lm || b.day > lm.getDayCount()) throw new BirthError("lunar");
    return Lunar.fromYmdHms(b.year, m, b.day, hour, 0, 0).getSolar();
  } catch {
    throw new BirthError("lunar");
  }
}

/** 사주 계산. 출생시간을 모르면 12시로 계산하되 시주는 빼고 오행에도 넣지 않는다 */
export function calcSaju(b: BirthInput): SajuResult {
  const known = b.hourIndex !== null && HOURS[b.hourIndex] !== undefined;
  const hour = known ? HOURS[b.hourIndex!].hour : 12;
  const solar = toSolar(b, hour);
  const ec = solar.getLunar().getEightChar();
  const pillars = { year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), time: known ? ec.getTime() : null };
  const dayGan = ec.getDayGan();

  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Element, number>;
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.time]) {
    if (!p) continue;
    const s = STEMS[p[0]];
    const br = BRANCHES[p[1]];
    if (s) elements[s[1]]++;
    if (br) elements[br[1]]++;
  }

  const [ganKo, ganEl] = STEMS[dayGan] ?? [dayGan, "?"];
  const dayGanLabel = `${ganKo}(${ganEl})`;
  const parts = [
    `년주 ${ganjiToHangul(pillars.year)}`,
    `월주 ${ganjiToHangul(pillars.month)}`,
    `일주 ${ganjiToHangul(pillars.day)}`,
  ];
  if (pillars.time) parts.push(`시주 ${ganjiToHangul(pillars.time)}`);
  let text = `${parts.join(", ")} / 일간 ${dayGanLabel} / 오행 ${ELEMENTS.map((e) => `${e}${elements[e]}`).join(" ")}`;
  if (!known) text += " / 출생시간 모름";

  return {
    pillars,
    dayGan,
    dayGanLabel,
    elements,
    solar: { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() },
    text,
  };
}

/** 오늘 날짜 (한국 시간 기준). 실행 시점 기준으로 계산 */
export function todayKST(now: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** 한국 나이와 만 나이 (양력 생일 기준) */
export function calcAge(
  solar: { year: number; month: number; day: number },
  today = todayKST(),
): { korean: number; full: number; text: string } {
  const korean = today.year - solar.year + 1;
  const hadBirthday = today.month > solar.month || (today.month === solar.month && today.day >= solar.day);
  const full = today.year - solar.year - (hadBirthday ? 0 : 1);
  // AI에는 한국 나이만 넘긴다 (만 나이를 같이 주면 결과 글에 만 나이가 섞여 나옴)
  return { korean, full, text: `${korean}세` };
}
