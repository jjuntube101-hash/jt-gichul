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

// --- Reset API ---

export const resetSchema = z.object({
  scope: z.enum(["solve", "all"]),
});

// --- Enrollment API ---

export const enrollSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(10)
    .transform((s) => s.trim().toUpperCase()),
});

// --- Comments API ---

export const commentSchema = z.object({
  questionNo: z.number().int().min(1).max(99999),
  body: safeString(1000).pipe(z.string().min(1, "댓글 내용을 입력해주세요.")),
  parentId: z.string().uuid().optional(),
});

export const commentPatchSchema = z.object({
  commentId: z.string().uuid(),
  action: z.enum(["delete", "pin", "unpin"]),
});

// --- Announce API ---

export const announceSchema = z.object({
  title: safeString(200).pipe(z.string().min(1)),
  body: z.string().max(5000).optional(),
  linkUrl: z.string().url().refine((u) => u.startsWith("http"), { message: "http/https URL만 허용" }).optional(),
  linkLabel: z.string().max(100).optional(),
  isPinned: z.boolean().optional().default(false),
});

// --- Admin Codes API ---

export const adminCodesSchema = z.object({
  count: z.number().int().min(1).max(200),
  batchName: z.string().max(100).optional().default(""),
  premiumDays: z.number().int().min(1).max(3650).optional().default(180),
  expiresAt: z.string().datetime().optional(),
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
