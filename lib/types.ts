// 화면·서버가 같이 쓰는 타입
import type { BirthInput } from "./saju";

/** 보기 선택 또는 직접 쓰기 */
export type Answer = { kind: "option"; index: number } | { kind: "custom"; text: string };

/** 맞춤 질문 이전 단계에서 모은 정보 (프롬프트 재료) */
export type Profile = {
  q1: Answer;
  q2: Answer | null; // Q1을 직접 쓰면 null
  rel: number | null; // [2-1] 관계 (해당 시)
  mbti: { code: string; estimated: boolean } | null;
  birth: BirthInput | null; // 건너뛰면 null
  ageBand: number | null; // 건너뛰었을 때 고른 나이대
};

/** 맞춤 질문 하나와 답 */
export type QA = { question: string; answer: string; focus: string };

export type GeneratedQuestion = { question: string; options: string[]; focus: string; last: boolean };

export type QuestionRequest = { profile: Profile; history: QA[] };
export type ResultRequest = { profile: Profile; history: QA[]; tone: number };
