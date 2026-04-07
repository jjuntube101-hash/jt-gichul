"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  MapPin,
  Calendar,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useTopicMastery } from "@/hooks/useTopicMastery";
import { getTodayReviewCards } from "@/lib/spacedRepetition";

interface JourneyMapProps {
  totalSolved: number;
  totalQuestions: number; // 전체 문항 수 (세법+회계)
  examTarget: "9급" | "7급";
  examDate?: string | null; // YYYY-MM-DD
  roadmapWeek?: number; // 현재 진행 주차
  roadmapTotal?: number; // 전체 주차 수
}

export default function JourneyMap({
  totalSolved,
  totalQuestions,
  examTarget,
  examDate,
  roadmapWeek,
  roadmapTotal,
}: JourneyMapProps) {
  const { data: lawMastery, loading: masteryLoading } = useTopicMastery();

  // 마스터 토픽 계산 (gold level)
  const masteryStats = useMemo(() => {
    if (!lawMastery?.length) return { mastered: 0, total: 0, inProgress: 0 };
    let mastered = 0;
    let total = 0;
    let inProgress = 0;
    for (const law of lawMastery) {
      for (const topic of law.topics) {
        total++;
        if (topic.level === "gold") mastered++;
        else if (topic.level === "green" || topic.level === "yellow")
          inProgress++;
      }
    }
    return { mastered, total, inProgress };
  }, [lawMastery]);

  // 복습 대기 문항
  const reviewDue = useMemo(() => {
    return getTodayReviewCards().length;
  }, []);

  // D-day 계산
  const dDay = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(examDate + "T00:00:00");
    const diff = Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  }, [examDate]);

  // 진도율
  const progressPct =
    totalQuestions > 0
      ? Math.min(100, Math.round((totalSolved / totalQuestions) * 100))
      : 0;

  const cards = [
    {
      key: "progress",
      icon: <BookOpen className="h-4 w-4" />,
      label: "풀이 진도",
      value: `${progressPct}%`,
      sub: `${totalSolved.toLocaleString()} / ${totalQuestions.toLocaleString()}문항`,
      color: "primary" as const,
      href: "/practice",
    },
    {
      key: "mastery",
      icon: <Trophy className="h-4 w-4" />,
      label: "마스터 토픽",
      value: masteryLoading ? "..." : `${masteryStats.mastered}`,
      sub: masteryLoading
        ? "로딩 중"
        : `${masteryStats.total}개 중 (${masteryStats.inProgress}개 진행 중)`,
      color: "success" as const,
      href: "/mypage#mastery",
    },
    {
      key: "roadmap",
      icon: <MapPin className="h-4 w-4" />,
      label: "로드맵",
      value:
        roadmapWeek && roadmapTotal
          ? `${roadmapWeek}주차`
          : "미설정",
      sub:
        roadmapWeek && roadmapTotal
          ? `전체 ${roadmapTotal}주 중`
          : `${examTarget} 커리큘럼`,
      color: "info" as const,
      href: "/roadmap",
    },
    {
      key: "dday",
      icon: <Calendar className="h-4 w-4" />,
      label: "D-day",
      value:
        dDay !== null
          ? dDay > 0
            ? `D-${dDay}`
            : dDay === 0
            ? "D-Day"
            : `D+${Math.abs(dDay)}`
          : "미설정",
      sub:
        dDay !== null && dDay > 0
          ? `${examDate?.slice(5).replace("-", "/")} 시험`
          : dDay !== null && dDay <= 0
          ? "시험 완료"
          : "시험일을 설정하세요",
      color: dDay !== null && dDay <= 7 && dDay > 0 ? ("danger" as const) : ("warning" as const),
      href: "/roadmap",
    },
  ];

  const colorMap = {
    primary: { text: "text-primary", bg: "bg-primary-light", bar: "bg-primary" },
    success: { text: "text-success", bg: "bg-success-light", bar: "bg-success" },
    info: { text: "text-info", bg: "bg-info-light", bar: "bg-info" },
    warning: { text: "text-warning", bg: "bg-warning-light", bar: "bg-warning" },
    danger: { text: "text-danger", bg: "bg-danger-light", bar: "bg-danger" },
  };

  return (
    <div className="space-y-3">
      {/* 4-card grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => {
          const c = colorMap[card.color];
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={card.href}
                className="block rounded-xl border border-border bg-card p-3.5 shadow-sm hover:shadow transition-all hover:border-primary/20 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg} ${c.text}`}
                  >
                    {card.icon}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className={`text-xl font-bold ${c.text}`}>{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {card.sub}
                </p>

                {/* 풀이 진도 프로그레스 바 */}
                {card.key === "progress" && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bar} transition-all duration-500`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {/* 로드맵 프로그레스 바 */}
                {card.key === "roadmap" && roadmapWeek && roadmapTotal && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bar} transition-all duration-500`}
                      style={{
                        width: `${Math.round((roadmapWeek / roadmapTotal) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* 복습 알림 배너 */}
      {reviewDue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link
            href="/review?tab=spaced"
            className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-light p-3 hover:border-warning/50 transition-colors"
          >
            <Sparkles className="h-4 w-4 text-warning flex-shrink-0" />
            <p className="text-xs font-medium text-foreground flex-1">
              오늘 복습할 문항이{" "}
              <span className="font-bold text-warning">{reviewDue}개</span>{" "}
              대기 중입니다
            </p>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
