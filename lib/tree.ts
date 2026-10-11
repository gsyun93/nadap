// 맞춤 질문 1~4번째 질문 트리 (고민 12갈래, 보기마다 완전 분기)
// 고민·마음을 보기에서 고른 경우에만 쓰고, 고른 갈래 파일 하나만 불러온다.
import type { Answer } from "./types";

export type TreeNode = { q: string; o: string[]; n: string[] | null };
export type TreeBranch = { start: string; nodes: Record<string, TreeNode> };

/** 트리로 만드는 맞춤 질문 개수 (1~4번째) */
export const TREE_DEPTH = 4;

/** 트리 질문의 focus (AI 프롬프트의 "이미 다룬 측면"에 들어감) */
export function treeFocus(step: number) {
  return step === 0 ? "지금 상황" : "구체적인 상황과 계기";
}

const LOADERS: Record<string, () => Promise<{ default: TreeBranch }>> = {
  W1: () => import("./tree/W1.json"),
  W2: () => import("./tree/W2.json"),
  W3: () => import("./tree/W3.json"),
  W4: () => import("./tree/W4.json"),
  R1: () => import("./tree/R1.json"),
  R2: () => import("./tree/R2.json"),
  R3: () => import("./tree/R3.json"),
  R4: () => import("./tree/R4.json"),
  M1: () => import("./tree/M1.json"),
  M2: () => import("./tree/M2.json"),
  M3: () => import("./tree/M3.json"),
  M4: () => import("./tree/M4.json"),
};

/** 고민·마음 보기 → 갈래 키 (W1~M4). 직접 쓴 경우 null */
export function branchKey(q1: Answer | null, q2: Answer | null): string | null {
  if (q1?.kind !== "option" || q2?.kind !== "option") return null;
  return `${"WRM"[q1.index]}${q2.index + 1}`;
}

const loaded = new Map<string, Promise<TreeBranch>>();

/** 갈래 파일 불러오기 (한 번만). 실패하면 다음에 다시 시도 */
export function loadBranch(key: string): Promise<TreeBranch> {
  let p = loaded.get(key);
  if (!p) {
    const loader = LOADERS[key];
    if (!loader) return Promise.reject(new Error(`unknown branch ${key}`));
    p = loader().then((m) => m.default);
    p.catch(() => loaded.delete(key));
    loaded.set(key, p);
  }
  return p;
}
