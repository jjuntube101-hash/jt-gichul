"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { BookOpen, CircleDot, Shuffle, LogOut, Target, Trophy, TrendingUp, Flame, Award, Bell, BellOff, Clock, FileX, Search, BarChart3 } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { useBadges } from "@/hooks/useBadges";
import { usePush } from "@/hooks/usePush";
import StreakBanner from "@/components/engagement/StreakBanner";
import BadgeGrid from "@/components/engagement/BadgeGrid";
import LawAccuracyChart from "@/components/stats/LawAccuracyChart";
import TopicMasteryMap from "@/components/stats/TopicMasteryMap";
import PeerBenchmark from "@/components/engagement/PeerBenchmark";

interface Stats {
  totalSolved: number;
  correctCount: number;
  oxTotal: number;
  oxCorrect: number;
}

export default function MyPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { streak, loading: streakLoading } = useStreak();
  const { earnedIds } = useBadges();
  const { permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePush();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    async function loadStats() {
      const supabase = getSupabase();
      if (!supabase || !user) {
        setStatsLoading(false);
        return;
      }

      try {
        const [solveRes, oxRes] = await Promise.all([
          supabase.from("solve_records").select("is_correct").eq("user_id", user.id),
          supabase.from("ox_records").select("is_correct").eq("user_id", user.id),
        ]);

        const solves = solveRes.data ?? [];
        const oxes = oxRes.data ?? [];

        setStats({
          totalSolved: solves.length,
          correctCount: solves.filter((s) => s.is_correct).length,
          oxTotal: oxes.length,
          oxCorrect: oxes.filter((o) => o.is_correct).length,
        });
      } catch {
        // ignore
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user) return null;

  const accuracy =
    stats && stats.totalSolved > 0
      ? Math.round((stats.correctCount / stats.totalSolved) * 100)
      : 0;
  const oxAccuracy =
    stats && stats.oxTotal > 0
      ? Math.round((stats.oxCorrect / stats.oxTotal) * 100)
      : 0;

  return (
    <div className="space-y-6 py-2">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border p-5 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
            {user.user_metadata?.name?.[0] ??
              user.email?.[0]?.toUpperCase() ??
              "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold truncate text-card-foreground">
              {user.user_metadata?.name ?? user.email ?? "사용자"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Streak */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <Flame className="h-4 w-4 text-orange-500" />
          학습 스트릭
        </h2>
        {streakLoading ? (
          <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
            </div>
          </div>
        ) : (
          <StreakBanner streak={streak} />
        )}
      </section>

      {/* Badges */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <Award className="h-4 w-4 text-primary" />
          뱃지 컬렉션
        </h2>
        <BadgeGrid earnedIds={earnedIds} showAll />
      </section>

      {/* Stats Grid */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          학습 통계
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                <div className="h-3 w-12 rounded bg-muted mb-2" />
                <div className="h-6 w-8 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<BookOpen className="h-4 w-4" />}
              label="풀이 문항"
              value={stats.totalSolved}
              unit="문항"
              color="primary"
            />
            <StatCard
              icon={<Target className="h-4 w-4" />}
              label="정답률"
              value={accuracy}
              unit="%"
              color={accuracy >= 70 ? "success" : accuracy >= 50 ? "warning" : "danger"}
            />
            <StatCard
              icon={<CircleDot className="h-4 w-4" />}
              label="OX 풀이"
              value={stats.oxTotal}
              unit="문항"
              color="primary"
            />
            <StatCard
              icon={<Trophy className="h-4 w-4" />}
              label="OX 정답률"
              value={oxAccuracy}
              unit="%"
              color={oxAccuracy >= 70 ? "success" : oxAccuracy >= 50 ? "warning" : "danger"}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">통계를 불러올 수 없습니다.</p>
        )}
      </section>

      {/* Peer Benchmark */}
      <section>
        <PeerBenchmark />
      </section>

      {/* Topic Mastery Map */}
      <section>
        <TopicMasteryMap />
      </section>

      {/* Law Accuracy */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <BarChart3 className="h-4 w-4 text-info" />
          과목별 정답률
        </h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <LawAccuracyChart />
        </div>
      </section>

      {/* Quick Menu */}
      <section>
        <h2 className="text-sm font-bold text-foreground mb-3">학습하기</h2>
        <div className="space-y-2">
          <MenuLink href="/practice?filter=random" icon={<Shuffle className="h-4 w-4 text-primary" />} label="랜덤 10문 풀기" />
          <MenuLink href="/ox" icon={<CircleDot className="h-4 w-4 text-success" />} label="OX 퀴즈" />
          <MenuLink href="/timer" icon={<Clock className="h-4 w-4 text-warning" />} label="타이머 모드" />
          <MenuLink href="/review" icon={<FileX className="h-4 w-4 text-danger" />} label="오답노트" />
          <MenuLink href="/search" icon={<Search className="h-4 w-4 text-info" />} label="문항 검색" />
          <MenuLink href="/practice" icon={<BookOpen className="h-4 w-4 text-primary" />} label="전체 문항 보기" />
        </div>
      </section>

      {/* Push Notification */}
      {permission !== "unsupported" && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">설정</h2>
          <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-card-foreground">학습 알림</p>
                <p className="text-[10px] text-muted-foreground">
                  {permission === "denied"
                    ? "브라우저 설정에서 알림을 허용해주세요"
                    : isSubscribed
                    ? "매일 학습 리마인더를 받습니다"
                    : "알림을 켜면 스트릭 유지에 도움이 됩니다"}
                </p>
              </div>
            </div>
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading || permission === "denied"}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isSubscribed
                  ? "bg-muted text-muted-foreground hover:text-foreground"
                  : "bg-primary text-white hover:bg-primary-hover"
              } disabled:opacity-50`}
            >
              {pushLoading ? "..." : isSubscribed ? "끄기" : "켜기"}
            </button>
          </div>
        </section>
      )}

      <Separator className="bg-border" />

      {/* Logout */}
      <button
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 bg-card py-3 text-sm font-medium text-danger hover:bg-danger-light transition-colors"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </button>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: "primary" | "success" | "warning" | "danger";
}) {
  const colorMap = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };
  const bgMap = {
    primary: "bg-primary-light",
    success: "bg-success-light",
    warning: "bg-warning-light",
    danger: "bg-danger-light",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${bgMap[color]} ${colorMap[color]}`}>
          {icon}
        </span>
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>
        {value}
        <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </motion.div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-sm font-medium text-card-foreground hover:border-primary/30 hover:shadow-sm transition-all"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
