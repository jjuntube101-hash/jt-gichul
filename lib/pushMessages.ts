/**
 * 스마트 푸시 알림 메시지 시스템
 * Hook Model 트리거: 내적 동기(불안, 성취욕)와 동기화
 *
 * 윤리적 제한:
 * - 하루 최대 2회
 * - 22~07시 금지
 * - 수치심 유발 메시지 금지
 * - 3회 연속 무시 시 빈도 감소
 */

export interface PushMessage {
  title: string;
  body: string;
  tag: string; // 중복 방지용
  data?: { url: string };
}

export type MessageType =
  | "morning_review"    // 아침: 어제 틀린 문항 복습
  | "streak_risk"       // 저녁: 스트릭 위험
  | "comeback"          // 3일+ 미접속 복귀
  | "achievement"       // 성취 축하
  | "daily_quest";      // 퀘스트 미완료

const MESSAGES: Record<MessageType, (ctx: MessageContext) => PushMessage> = {
  morning_review: (ctx) => ({
    title: "어제 복습할 것이 있어요",
    body: ctx.wrongCount
      ? `어제 ${ctx.law}에서 ${ctx.wrongCount}문항 틀렸어요. 지금 복습하면 기억이 2배!`
      : "어제 학습한 내용을 복습해보세요",
    tag: "morning-review",
    data: { url: "/review" },
  }),

  streak_risk: (ctx) => ({
    title: `${ctx.streakDays ?? 1}일째 스트릭!`,
    body: "1문제만 풀어도 스트릭이 유지돼요. 지금 도전!",
    tag: "streak-risk",
    data: { url: "/ox" },
  }),

  comeback: (ctx) => ({
    title: "다시 시작해볼까요?",
    body: ctx.law
      ? `${ctx.law} 정답률 ${ctx.accuracy}%에서 시작했는데, 지금 어디쯤?`
      : "잠깐이라도 1문제 풀어보세요",
    tag: "comeback",
    data: { url: "/" },
  }),

  achievement: (ctx) => ({
    title: "축하해요!",
    body: ctx.message ?? "새로운 성취를 달성했습니다!",
    tag: "achievement",
    data: { url: "/mypage" },
  }),

  daily_quest: (ctx) => ({
    title: "오늘의 퀘스트 진행 중",
    body: `${ctx.questCompleted}/3 완료! 나머지도 클리어해보세요`,
    tag: "daily-quest",
    data: { url: "/" },
  }),
};

export interface MessageContext {
  wrongCount?: number;
  law?: string;
  accuracy?: number;
  streakDays?: number;
  questCompleted?: number;
  message?: string;
}

export function buildPushMessage(
  type: MessageType,
  ctx: MessageContext = {}
): PushMessage {
  return MESSAGES[type](ctx);
}

/**
 * 알림 발송 가능 시간 체크 (KST 07~22시)
 */
export function isNotificationHour(): boolean {
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  return kstHour >= 7 && kstHour < 22;
}
