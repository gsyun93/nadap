// 맞춤 질문 생성 (POST, JSON 응답)
//  - { profile, history }            → 다음 질문 1개
//  - { profile, history, current }   → 지금 질문(current)의 보기 4개 각각에 대한 다음 질문 4개를 한 번에 (미리 만들기용)
import { AIError, generateQuestionJSON } from "@/lib/ai";
import { questionLimits } from "@/lib/flow";
import { buildBatchQuestionPrompt, buildQuestionPrompt } from "@/lib/prompts";
import {
  clientIp,
  json,
  parseCurrent,
  parseHistory,
  parseProfile,
  rateLimited,
  validateQuestion,
} from "@/lib/server-utils";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (rateLimited(`q:${clientIp(req)}`, 60)) return json({ error: "rate_limit" }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const b = body as { profile?: unknown; history?: unknown; current?: unknown };
  const profile = parseProfile(b.profile);
  const history = parseHistory(b.history, 30);
  if (!profile || !history) return json({ error: "bad_request" }, 400);
  const { min, max } = questionLimits(profile);

  try {
    if (b.current !== undefined) {
      // 한 번에 4개
      const current = parseCurrent(b.current);
      const n = history.length + 2;
      if (!current || n > max) return json({ error: "bad_request" }, 400);
      const raw = await generateQuestionJSON(buildBatchQuestionPrompt(profile, history, current), true);
      const list = (raw as { next?: unknown })?.next;
      if (!Array.isArray(list)) return json({ error: "bad_output" }, 502);
      // 보기 순서대로 맞춰서, 검증에 실패한 자리는 null (그 보기는 나중에 1개씩 요청)
      const questions = current.options.map((_, i) => validateQuestion(list[i], n, min));
      if (questions.every((q) => q === null)) return json({ error: "bad_output" }, 502);
      return json({ questions });
    }

    // 1개
    const n = history.length + 1;
    if (history.length === 0 || n > max) return json({ error: "bad_request" }, 400);
    const raw = await generateQuestionJSON(buildQuestionPrompt(profile, history));
    const q = validateQuestion(raw, n, min);
    if (!q) return json({ error: "bad_output" }, 502);
    return json(q);
  } catch (err) {
    if (err instanceof AIError) {
      if (err.message === "no_key") return json({ error: "no_key" }, 503);
      if (err.rateLimited) return json({ error: "rate_limit" }, 429);
    }
    return json({ error: "ai_error" }, 502);
  }
}
