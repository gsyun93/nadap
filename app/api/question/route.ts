// 맞춤 질문 1개 생성 (POST, JSON 응답)
import { AIError, generateQuestionJSON } from "@/lib/ai";
import { questionLimits } from "@/lib/flow";
import { buildQuestionPrompt } from "@/lib/prompts";
import { clientIp, json, parseHistory, parseProfile, rateLimited, validateQuestion } from "@/lib/server-utils";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (rateLimited(`q:${clientIp(req)}`, 60)) return json({ error: "rate_limit" }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const b = body as { profile?: unknown; history?: unknown };
  const profile = parseProfile(b.profile);
  const history = parseHistory(b.history, 30);
  if (!profile || !history || history.length === 0) return json({ error: "bad_request" }, 400);

  const { min, max } = questionLimits(profile);
  const n = history.length + 1;
  if (n > max) return json({ error: "bad_request" }, 400);

  try {
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
