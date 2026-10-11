// 결과 생성 (POST, 텍스트 스트리밍 응답)
import { AIError, streamResult } from "@/lib/ai";
import { buildResultPrompt } from "@/lib/prompts";
import { SAMPLE_RESULT } from "@/lib/sample-result";
import { clientIp, json, parseHistory, parseProfile, parseTone, rateLimited } from "@/lib/server-utils";

export const maxDuration = 60;

const TEXT_HEADERS = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

export async function POST(req: Request) {
  if (rateLimited(`r:${clientIp(req)}`, 3)) return json({ error: "rate_limit" }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const b = body as { profile?: unknown; history?: unknown; tone?: unknown };
  const profile = parseProfile(b.profile);
  const history = parseHistory(b.history, 30);
  const tone = parseTone(b.tone);
  if (!profile || !history || history.length === 0 || tone === null) return json({ error: "bad_request" }, 400);

  let chunks: AsyncIterable<string>;
  let sample = false;
  try {
    chunks = await streamResult(buildResultPrompt(profile, history, tone));
  } catch (err) {
    if (err instanceof AIError && err.message === "no_key") {
      // 키가 없는 동안에는 예시 결과로 화면을 끝까지 돌려볼 수 있게
      chunks = sampleChunks();
      sample = true;
    } else if (err instanceof AIError && err.rateLimited) {
      return json({ error: "rate_limit" }, 429);
    } else {
      return json({ error: "ai_error" }, 502);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const t of chunks) controller.enqueue(encoder.encode(t));
        controller.close();
      } catch {
        // 중간에 끊기면 받은 데까지는 화면에 남기고, 클라이언트가 오류를 표시한다
        controller.error(new Error("stream_failed"));
      }
    },
  });
  return new Response(stream, { headers: { ...TEXT_HEADERS, ...(sample ? { "x-nadap-sample": "1" } : {}) } });
}

async function* sampleChunks() {
  for (const piece of SAMPLE_RESULT.match(/[\s\S]{1,12}/g) ?? []) {
    await new Promise((r) => setTimeout(r, 30));
    yield piece;
  }
}
