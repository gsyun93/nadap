// 질문 개수·진행률 계산 (기획서 8-1, 10번)
import { REL_TRIGGER } from "./data";
import type { Profile } from "./types";

/** 고정 질문 수 F (실제로 보여준 고정 화면 수) */
export function fixedCount(p: Pick<Profile, "q1" | "q2" | "rel" | "mbti" | "birth" | "ageBand">): number {
  let f = 1; // 고민
  if (p.q1.kind === "option") f += 1; // 마음 (Q1을 직접 쓰면 마음 화면을 건너뜀)
  if (p.rel !== null || needsRel(p)) f += 1; // 관계
  f += 1; // MBTI
  if (p.mbti?.estimated) f += 4; // 간단 질문
  f += 1; // 생년월일
  if (!p.birth) f += 1; // 나이대 (건너뛰었을 때)
  return f;
}

export function needsRel(p: Pick<Profile, "q1" | "q2">): boolean {
  return (
    p.q1.kind === "option" &&
    p.q1.index === REL_TRIGGER.q1 &&
    p.q2?.kind === "option" &&
    p.q2.index === REL_TRIGGER.q2
  );
}

/** 맞춤 질문 최소·최대 개수 */
export function limitsFromFixed(f: number): { min: number; max: number } {
  return { min: Math.max(8, 20 - (f + 1)), max: Math.max(12, 30 - (f + 1)) };
}

export function questionLimits(p: Profile): { min: number; max: number } {
  return limitsFromFixed(fixedCount(p));
}

/** 예비 질문으로 진행 중일 때 맞춤 질문 최대 개수 */
export const FALLBACK_LIMIT = 8;

/**
 * 맞춤 질문 i번째(0부터)에 답한 뒤 끝낼지
 * last: 그 질문의 last 값, usingFallback: 예비 질문으로 진행 중인지
 */
export function shouldFinish(i: number, last: boolean, limits: { min: number; max: number }, usingFallback: boolean) {
  if (i + 1 >= limits.max) return true;
  if (i + 1 >= limits.min && last) return true;
  if (usingFallback && i + 1 >= FALLBACK_LIMIT) return true;
  return false;
}

/** 진행률 % = 지나온 화면 수 / (예상 전체 화면 수 + 1), 최대 97 */
export function progressPercent(passed: number, f: number, customMade: number, limits: { min: number; max: number }) {
  const expectedCustom = Math.min(limits.max, Math.max(limits.min, customMade + 1));
  const total = f + expectedCustom + 1;
  return Math.min(97, Math.round((passed / (total + 1)) * 100));
}
