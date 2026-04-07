/**
 * Claude API 클라이언트 모듈
 *
 * @anthropic-ai/sdk를 래핑하여 JT기출 앱 전용 Claude API 호출을 제공.
 * - 모델 라우팅: haiku(가벼운 기능) / sonnet(심층 분석)
 * - 에러 핸들링 + 타임아웃
 * - 토큰 사용량 로깅 (Supabase ai_usage 테이블)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AIFeature } from "./aiConfig";
import { AI_FEATURES } from "./aiConfig";

// --- 모델 매핑 ---

const MODEL_MAP: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",   // 경량 기능 (브리핑, 오답진단, 모의고사) — 비용 1/10
  sonnet: "claude-sonnet-4-20250514",   // 심층 분석 (주간보고서, D-day전략)
};

// --- 클라이언트 싱글턴 ---

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// --- 공통 호출 인터페이스 ---

export interface ClaudeRequest {
  feature: AIFeature;
  systemPrompt: string;
  userMessage: string;
  messages?: { role: 'user' | 'assistant'; content: string }[];  // 멀티턴 대화
  modelOverride?: string;  // premium 사용자용 모델 오버라이드 ('haiku' | 'sonnet')
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/**
 * Claude API 호출
 *
 * @throws Error API 키 미설정, 네트워크 오류, 타임아웃 시
 */
export async function callClaude(req: ClaudeRequest): Promise<ClaudeResponse> {
  const featureConfig = AI_FEATURES[req.feature];
  const modelKey = req.modelOverride || featureConfig.model;
  const modelId = MODEL_MAP[modelKey] || MODEL_MAP.haiku;

  const anthropic = getClient();
  const startTime = Date.now();

  // 멀티턴 메시지가 있으면 사용, 없으면 단일 메시지
  const messages = req.messages
    ? req.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    : [{ role: 'user' as const, content: req.userMessage }];

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: req.maxTokens ?? 1024,
    temperature: req.temperature ?? 0.3,
    system: req.systemPrompt,
    messages,
  });

  const durationMs = Date.now() - startTime;

  // 텍스트 블록 추출
  const textBlock = response.content.find((b) => b.type === "text");
  const content = textBlock?.text ?? "";

  return {
    content,
    model: modelId,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
  };
}

/**
 * JSON 응답을 기대하는 Claude API 호출
 * content를 파싱하여 객체로 반환. 파싱 실패 시 raw text 반환.
 */
export async function callClaudeJSON<T = unknown>(
  req: ClaudeRequest
): Promise<{ data: T; meta: Omit<ClaudeResponse, "content"> }> {
  const response = await callClaude({
    ...req,
    systemPrompt:
      req.systemPrompt +
      "\n\n반드시 유효한 JSON만 출력하세요. 설명, 마크다운, 코드블록 없이 순수 JSON만.",
  });

  let data: T;
  try {
    // Remove potential markdown code block wrapper
    let cleaned = response.content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    data = JSON.parse(cleaned);
  } catch {
    // JSON 파싱 실패 시 raw text를 그대로 반환
    data = response.content as unknown as T;
  }

  return {
    data,
    meta: {
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      durationMs: response.durationMs,
    },
  };
}

/**
 * AI 사용량 로깅 (Supabase ai_usage 테이블)
 */
export async function logAIUsage(params: {
  userId: string;
  feature: AIFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  cached: boolean;
}): Promise<void> {
  try {
    // 동적 import로 서버사이드 Supabase 사용
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    await supabase.from("ai_usage").insert({
      user_id: params.userId,
      feature: params.feature,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      duration_ms: params.durationMs,
      cached: params.cached,
      created_at: new Date().toISOString(),
    });
  } catch {
    // 로깅 실패는 무시
  }
}
