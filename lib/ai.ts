// AI 호출 래퍼. 회사·모델·키는 환경변수로만 정한다 (서버 전용, 브라우저로 보내지 않음).
//   QUESTION_PROVIDER / QUESTION_MODEL / QUESTION_API_KEY  → 질문 생성용 (빠르고 싼 모델)
//   RESULT_PROVIDER   / RESULT_MODEL   / RESULT_API_KEY    → 결과 생성용 (똑똑한 모델, 스트리밍)
// 지원 회사: anthropic | google | openai
import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GoogleApiError, GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import OpenAI from "openai";

type Provider = "anthropic" | "google" | "openai";
type Role = "QUESTION" | "RESULT";
type AIConfig = { provider: Provider; model: string; apiKey: string; workspaceId?: string };

/** AI 호출 실패. rateLimited = 회사 쪽 호출 한도(429)에 걸림 */
export class AIError extends Error {
  constructor(
    message: string,
    public rateLimited = false,
    public serverError = false,
  ) {
    super(message);
  }
}

export function getConfig(role: Role): AIConfig | null {
  const provider = process.env[`${role}_PROVIDER`]?.trim().toLowerCase();
  const model = process.env[`${role}_MODEL`]?.trim();
  const apiKey = process.env[`${role}_API_KEY`]?.trim();
  if (!provider || !model || !apiKey) return null;
  if (provider !== "anthropic" && provider !== "google" && provider !== "openai") return null;
  const workspaceId = role === "RESULT" ? process.env.RESULT_WORKSPACE_ID?.trim() : undefined;
  return { provider, model, apiKey, workspaceId: workspaceId || undefined };
}

// ── 클라이언트 (키별로 하나씩 재사용) ──
const anthropicClients = new Map<string, Anthropic>();
function anthropic(c: AIConfig, timeout: number, maxRetries: number) {
  const k = `${c.apiKey}|${c.workspaceId ?? ""}|${timeout}`;
  let client = anthropicClients.get(k);
  if (!client) {
    client = new Anthropic({
      apiKey: c.apiKey,
      timeout,
      maxRetries,
      defaultHeaders: c.workspaceId ? { "anthropic-workspace-id": c.workspaceId } : undefined,
    });
    anthropicClients.set(k, client);
  }
  return client;
}
const googleClients = new Map<string, GoogleGenAI>();
function google(c: AIConfig) {
  let client = googleClients.get(c.apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey: c.apiKey });
    googleClients.set(c.apiKey, client);
  }
  return client;
}
const openaiClients = new Map<string, OpenAI>();
function openai(c: AIConfig, timeout: number, maxRetries: number) {
  const k = `${c.apiKey}|${timeout}`;
  let client = openaiClients.get(k);
  if (!client) {
    client = new OpenAI({ apiKey: c.apiKey, timeout, maxRetries });
    openaiClients.set(k, client);
  }
  return client;
}

/** 회사별 오류를 AIError로 통일 (프롬프트 본문은 로그에 남기지 않는다) */
function toAIError(err: unknown, where: string): AIError {
  if (err instanceof AIError) return err;
  let status: number | undefined;
  if (err instanceof Anthropic.APIError) status = err.status;
  else if (err instanceof GoogleApiError) status = err.status;
  else if (err instanceof OpenAI.APIError) status = err.status;
  console.error(`[ai] ${where} 실패: status=${status ?? "?"} ${err instanceof Error ? err.name : ""}`);
  return new AIError(`${where} failed (${status ?? "unknown"})`, status === 429, status !== undefined && status >= 500);
}

// ── 질문 생성 (짧은 JSON) ──
const QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    focus: { type: "string" },
    last: { type: "boolean" },
  },
  required: ["question", "options", "focus", "last"],
  additionalProperties: false,
} as const;

/** 보기 4개 각각의 다음 질문을 한 번에: {"next":[질문 ×4]} */
const BATCH_JSON_SCHEMA = {
  type: "object",
  properties: { next: { type: "array", items: QUESTION_JSON_SCHEMA } },
  required: ["next"],
  additionalProperties: false,
} as const;

const GEMINI_QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    focus: { type: Type.STRING },
    last: { type: Type.BOOLEAN },
  },
  required: ["question", "options", "focus", "last"],
};
const GEMINI_BATCH_SCHEMA = {
  type: Type.OBJECT,
  properties: { next: { type: Type.ARRAY, items: GEMINI_QUESTION_SCHEMA } },
  required: ["next"],
};

/**
 * 질문용 모델 호출 → 파싱된 JSON (검증은 호출하는 쪽에서). 회사 쪽 일시 오류(5xx)면 한 번 더 시도
 * batch = true면 다음 질문 4개를 한 번에 ({"next":[...]})
 */
export async function generateQuestionJSON(prompt: string, batch = false): Promise<unknown> {
  try {
    return await generateQuestionOnce(prompt, batch);
  } catch (err) {
    if (err instanceof AIError && err.serverError) return generateQuestionOnce(prompt, batch);
    throw err;
  }
}

async function generateQuestionOnce(prompt: string, batch: boolean): Promise<unknown> {
  const c = getConfig("QUESTION");
  if (!c) throw new AIError("no_key");
  const timeout = batch ? 30_000 : 20_000;
  try {
    let text = "";
    if (c.provider === "anthropic") {
      const res = await anthropic(c, timeout, 0).messages.create({
        model: c.model,
        max_tokens: batch ? 3000 : 1024,
        // Haiku는 생각하기를 꺼서 빠르게, 그 외 모델은 생각하기를 끌 수 없어 노력 수준을 낮춘다
        ...(c.model.includes("haiku") ? { thinking: { type: "disabled" as const } } : {}),
        output_config: {
          ...(c.model.includes("haiku") ? {} : { effort: "low" as const }),
          format: { type: "json_schema", schema: batch ? BATCH_JSON_SCHEMA : QUESTION_JSON_SCHEMA },
        },
        messages: [{ role: "user", content: prompt }],
      });
      text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } else if (c.provider === "google") {
      const res = await google(c).models.generateContent({
        model: c.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: batch ? GEMINI_BATCH_SCHEMA : GEMINI_QUESTION_SCHEMA,
          // Gemini 3 이상은 생각하기를 최소로 (속도 우선)
          ...(/gemini-[3-9]/.test(c.model) ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
          abortSignal: AbortSignal.timeout(timeout),
        },
      });
      text = res.text ?? "";
    } else {
      const res = await openai(c, timeout, 0).chat.completions.create({
        model: c.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      text = res.choices[0]?.message?.content ?? "";
    }
    return JSON.parse(stripFence(text));
  } catch (err) {
    if (err instanceof SyntaxError) throw new AIError("bad_json");
    throw toAIError(err, batch ? "question-batch" : "question");
  }
}

function stripFence(s: string) {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
}

// ── 결과 생성 (스트리밍) ──
/**
 * 결과용 모델 스트리밍. 연결(첫 응답 헤더)까지 기다렸다가 텍스트 조각을 내보내는 iterator를 돌려준다.
 * 연결 단계의 오류(429 등)는 여기서 바로 AIError로 던진다.
 */
export async function streamResult(prompt: string): Promise<AsyncIterable<string>> {
  const c = getConfig("RESULT");
  if (!c) throw new AIError("no_key");
  try {
    if (c.provider === "anthropic") {
      // 안전 분류기가 오탐으로 거절하면 서버에서 다른 모델로 자동 재시도 (fallbacks: "default")
      const stream = await anthropic(c, 120_000, 1).beta.messages.create({
        model: c.model,
        max_tokens: 4000,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
      return (async function* () {
        try {
          for await (const ev of stream) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
            if (ev.type === "message_delta" && ev.delta.stop_reason === "refusal") throw new AIError("refusal");
          }
        } catch (err) {
          throw toAIError(err, "result-stream");
        }
      })();
    }
    if (c.provider === "google") {
      const stream = await google(c).models.generateContentStream({ model: c.model, contents: prompt });
      return (async function* () {
        try {
          for await (const chunk of stream) if (chunk.text) yield chunk.text;
        } catch (err) {
          throw toAIError(err, "result-stream");
        }
      })();
    }
    const stream = await openai(c, 120_000, 1).chat.completions.create({
      model: c.model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });
    return (async function* () {
      try {
        for await (const chunk of stream) {
          const t = chunk.choices[0]?.delta?.content;
          if (t) yield t;
        }
      } catch (err) {
        throw toAIError(err, "result-stream");
      }
    })();
  } catch (err) {
    throw toAIError(err, "result");
  }
}
