/**
 * API 요청 바디 Zod 스키마
 * - 각 AI feature별 입력 검증
 * - 푸시 API 입력 검증
 */

import { z } from "zod";

// --- 공통 ---

/** 프롬프트 인젝션 방지용 문자열 정제 */
const safeString = (maxLen: number) =>
  z.string().max(maxLen).transform((s) => s.trim());

// --- AI Features ---

export const wrongAnswerSchema = z.object({
  questionNo: z.number().int().min(1).max(99999),
  selectedChoice: z.number().int().min(1).max(5),
});

export const mockExamSchema = z.object({
  examTarget: z.enum(["9급", "7급"]).default("9급"),
  subject: z.enum(["tax", "accounting"]).default("tax"),
  taxScope: z.enum(["all", "national", "local"]).default("all"),
});

export const weeklyReportSchema = z.object({
  examTarget: z.enum(["9급", "7급"]).default("9급"),
});

export const ddayStrategySchema = z.object({
  examTarget: z.enum(["9급", "7급"]).default("9급"),
});

export const askSchema = z.object({
  question: safeString(500).pipe(z.string().min(2, "질문을 입력해주세요.")),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export const briefingSchema = z.object({}).passthrough();

// --- Push API ---

export const pushSchema = z.object({
  type: z.enum([
    "morning_review",
    "streak_risk",
    "comeback",
    "achievement",
    "daily_quest",
  ]),
  userId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional().default({}),
});

// --- Feature → Schema 매핑 ---

export const featureSchemas: Record<string, z.ZodTypeAny> = {
  wrong_answer: wrongAnswerSchema,
  mock_exam: mockExamSchema,
  weekly_report: weeklyReportSchema,
  dday_strategy: ddayStrategySchema,
  ask: askSchema,
  briefing: briefingSchema,
};
