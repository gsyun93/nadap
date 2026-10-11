// API 라우트 공통: 입력 검증, IP 기준 호출 제한, AI 응답 검증
import { AGES, CUSTOM_MAX, HOURS, MBTI_NICK, Q1, Q2, REL, TONES } from "./data";
import { needsRel } from "./flow";
import { calcSaju, type BirthInput } from "./saju";
import type { Answer, GeneratedQuestion, Profile, QA } from "./types";

// ── 호출 제한 (IP별 1분 창). 서버 인스턴스마다 따로 세므로 대략적인 남용 방지용 ──
const hits = new Map<string, number[]>();
export function rateLimited(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= limitPerMinute) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  }
  return false;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// ── 입력 검증 ──
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const cleanText = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;

function parseAnswer(v: unknown, optionCount: number): Answer | null {
  if (!isObj(v)) return null;
  if (v.kind === "option" && isInt(v.index, 0, optionCount - 1)) return { kind: "option", index: v.index };
  if (v.kind === "custom") {
    const text = cleanText(v.text, CUSTOM_MAX);
    return text ? { kind: "custom", text } : null;
  }
  return null;
}

function parseBirth(v: unknown): BirthInput | null {
  if (!isObj(v)) return null;
  if (v.gender !== "남자" && v.gender !== "여자") return null;
  if (v.calendar !== "solar" && v.calendar !== "lunar") return null;
  if (!isInt(v.year, 1900, 2100) || !isInt(v.month, 1, 12) || !isInt(v.day, 1, 31)) return null;
  if (v.hourIndex !== null && !isInt(v.hourIndex, 0, HOURS.length - 1)) return null;
  const b: BirthInput = {
    gender: v.gender,
    calendar: v.calendar,
    year: v.year,
    month: v.month,
    day: v.day,
    leap: v.calendar === "lunar" && v.leap === true,
    hourIndex: v.hourIndex as number | null,
  };
  try {
    calcSaju(b);
  } catch {
    return null;
  }
  return b;
}

export function parseProfile(v: unknown): Profile | null {
  if (!isObj(v)) return null;
  const q1 = parseAnswer(v.q1, Q1.length);
  if (!q1) return null;
  let q2: Answer | null = null;
  if (q1.kind === "option") {
    q2 = parseAnswer(v.q2, Q2[q1.index].length);
    if (!q2) return null;
  }
  let rel: number | null = null;
  if (needsRel({ q1, q2 })) {
    if (!isInt(v.rel, 0, REL.length - 1)) return null;
    rel = v.rel;
  }
  let mbti: Profile["mbti"] = null;
  if (isObj(v.mbti) && typeof v.mbti.code === "string" && MBTI_NICK[v.mbti.code]) {
    mbti = { code: v.mbti.code, estimated: v.mbti.estimated === true };
  }
  const birth = v.birth === null || v.birth === undefined ? null : parseBirth(v.birth);
  if (v.birth && !birth) return null;
  let ageBand: number | null = null;
  if (!birth && isInt(v.ageBand, 0, AGES.length - 1)) ageBand = v.ageBand;
  return { q1, q2, rel, mbti, birth, ageBand };
}

export function parseHistory(v: unknown, maxItems: number): QA[] | null {
  if (!Array.isArray(v) || v.length > maxItems) return null;
  const out: QA[] = [];
  for (const item of v) {
    if (!isObj(item)) return null;
    const question = cleanText(item.question, 120);
    const answer = cleanText(item.answer, CUSTOM_MAX);
    const focus = typeof item.focus === "string" ? item.focus.trim().slice(0, 60) : "";
    if (!question || !answer) return null;
    out.push({ question, answer, focus });
  }
  return out;
}

export function parseTone(v: unknown): number | null {
  return isInt(v, 0, TONES.length - 1) ? v : null;
}

/** AI 응답 검증: question 문자열, options 3~4개 → 4개로 자르기, last는 true일 때만 true */
export function validateQuestion(v: unknown, n: number, min: number): GeneratedQuestion | null {
  if (!isObj(v)) return null;
  const question = typeof v.question === "string" ? v.question.trim() : "";
  if (!question) return null;
  if (!Array.isArray(v.options)) return null;
  const options = v.options.filter((o): o is string => typeof o === "string" && o.trim() !== "").map((o) => o.trim());
  if (options.length < 3) return null;
  const focus = typeof v.focus === "string" ? v.focus.trim().slice(0, 60) : "";
  return { question, options: options.slice(0, 4), focus, last: v.last === true && n >= min };
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
