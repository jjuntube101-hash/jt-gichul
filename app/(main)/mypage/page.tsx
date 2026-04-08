"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import {
  BookOpen,
  CircleDot,
  Shuffle,
  LogOut,
  Target,
  Trophy,
  TrendingUp,
  Flame,
  Award,
  Bell,
  BellOff,
  Clock,
  FileX,
  Search,
  BarChart3,
  ClipboardList,
  Calendar,
  Pencil,
  Check,
  X,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Trash2,
  AlertTriangle,
  GraduationCap,
  KeyRound,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useStreak } from "@/hooks/useStreak";
import { useBadges } from "@/hooks/useBadges";
import { usePush } from "@/hooks/usePush";
import { usePremium } from "@/hooks/usePremium";
import StreakBanner from "@/components/engagement/StreakBanner";
import BadgeGrid from "@/components/engagement/BadgeGrid";
import LawAccuracyChart from "@/components/stats/LawAccuracyChart";
import WeeklyTrendChart from "@/components/stats/WeeklyTrendChart";
import TopicMasteryMap from "@/components/stats/TopicMasteryMap";
import PeerBenchmark from "@/components/engagement/PeerBenchmark";
import JourneyMap from "@/components/progress/JourneyMap";
import { getRoadmap } from "@/lib/roadmap";

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
  const {
    permission,
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePush();
  const { theme, setTheme } = useTheme();

  // 프로필 편집 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editExamTarget, setEditExamTarget] = useState<
    "9급" | "7급"
  >("9급");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [examDate, setExamDate] = useState<string | null>(null);

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
        const [solveRes, oxRes, profileRes] = await Promise.all([
          supabase.from("solve_records").select("is_correct").eq("user_id", user.id),
          supabase.from("ox_records").select("is_correct").eq("user_id", user.id),
          supabase
            .from("user_study_profiles")
            .select("exam_target, display_name, exam_date")
            .eq("user_id", user.id)
            .single(),
        ]);

        const solves = solveRes.data ?? [];
        const oxes = oxRes.data ?? [];

        setStats({
          totalSolved: solves.length,
          correctCount: solves.filter((s) => s.is_correct).length,
          oxTotal: oxes.length,
          oxCorrect: oxes.filter((o) => o.is_correct).length,
        });

        // 프로필 초기값 설정
        if (profileRes.data) {
          setEditExamTarget(
            (profileRes.data.exam_target as "9급" | "7급") ?? "9급"
          );
          setEditName(
            profileRes.data.display_name ?? user.user_metadata?.name ?? ""
          );
          setExamDate(profileRes.data.exam_date ?? null);
        } else {
          setEditName(user.user_metadata?.name ?? "");
        }
        setProfileLoaded(true);
      } catch {
        // ignore
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [user, authLoading, router]);

  // 로드맵 주차 계산
  const roadmapInfo = useMemo(() => {
    if (!profileLoaded) return null;
    // 세법 로드맵 기준 (회계 로드맵은 별도 탭에서)
    const rm = getRoadmap(editExamTarget);
    if (!rm) return null;

    let currentWeek: number | undefined;
    if (examDate) {
      const now = new Date();
      const exam = new Date(examDate + "T00:00:00");
      const weeksLeft = Math.ceil(
        (exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      currentWeek = Math.max(1, rm.totalWeeks - weeksLeft + 1);
      if (currentWeek > rm.totalWeeks) currentWeek = rm.totalWeeks;
    }

    return { currentWeek, totalWeeks: rm.totalWeeks };
  }, [profileLoaded, editExamTarget, examDate]);

  // 총 문항 수 (9급/7급 모두 세법+회계 = 2,065)
  const totalQuestions = 2065;

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      await supabase.from("user_study_profiles").upsert(
        {
          user_id: user.id,
          display_name: editName.trim() || null,
          exam_target: editExamTarget,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setIsEditingProfile(false);
    } catch {
      // ignore
    } finally {
      setProfileSaving(false);
    }
  };

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
        {isEditingProfile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">프로필 편집</p>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                이름
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                시험 목표
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["9급", "7급"] as const).map((target) => (
                  <button
                    key={target}
                    onClick={() => setEditExamTarget(target)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      editExamTarget === target
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {profileSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {(
                editName ||
                user.user_metadata?.name ||
                user.email ||
                "U"
              )[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate text-card-foreground">
                {editName ||
                  user.user_metadata?.name ||
                  user.email ||
                  "사용자"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              {profileLoaded && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  목표: {editExamTarget}
                  {examDate && ` · 시험일: ${examDate.slice(5).replace("-", "/")}`}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="shrink-0 flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              편집
            </button>
          </div>
        )}
      </motion.div>

      {/* 강의실 배너 — 프로필 바로 아래 눈에 띄는 위치 */}
      <ClassroomBanner />

      {/* Journey Map — 핵심 대시보드 */}
      {!statsLoading && stats && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            학습 여정
          </h2>
          <JourneyMap
            totalSolved={stats.totalSolved + stats.oxTotal}
            totalQuestions={totalQuestions}
            examTarget={editExamTarget}
            examDate={examDate}
            roadmapWeek={roadmapInfo?.currentWeek}
            roadmapTotal={roadmapInfo?.totalWeeks}
          />
        </section>
      )}

      {/* Streak */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <Flame className="h-4 w-4 text-warning" />
          학습 스트릭
        </h2>
        {streakLoading ? (
          <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
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

      {/* Stats Grid */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <Target className="h-4 w-4 text-primary" />
          정답률
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4 animate-pulse"
              >
                <div className="h-3 w-12 rounded bg-muted mb-2" />
                <div className="h-6 w-8 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<BookOpen className="h-4 w-4" />}
              label="문항 풀이"
              value={accuracy}
              unit="%"
              sub={`${stats.correctCount} / ${stats.totalSolved}문항`}
              color={
                accuracy >= 70
                  ? "success"
                  : accuracy >= 50
                  ? "warning"
                  : "danger"
              }
            />
            <StatCard
              icon={<CircleDot className="h-4 w-4" />}
              label="OX 퀴즈"
              value={oxAccuracy}
              unit="%"
              sub={`${stats.oxCorrect} / ${stats.oxTotal}문항`}
              color={
                oxAccuracy >= 70
                  ? "success"
                  : oxAccuracy >= 50
                  ? "warning"
                  : "danger"
              }
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            통계를 불러올 수 없습니다.
          </p>
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

      {/* Peer Benchmark */}
      <section>
        <PeerBenchmark />
      </section>

      {/* Topic Mastery Map */}
      <section id="mastery">
        <TopicMasteryMap />
      </section>

      {/* Weekly Trend */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
          <TrendingUp className="h-4 w-4 text-success" />
          주간 추이
        </h2>
        <WeeklyTrendChart />
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
          <MenuLink
            href="/dday-strategy"
            icon={<Calendar className="h-4 w-4 text-primary" />}
            label="D-day 전략"
          />
          <MenuLink
            href="/weekly-report"
            icon={<ClipboardList className="h-4 w-4 text-info" />}
            label="약점 해부 보고서"
          />
          <MenuLink
            href="/practice?filter=random"
            icon={<Shuffle className="h-4 w-4 text-primary" />}
            label="랜덤 10문 풀기"
          />
          <MenuLink
            href="/ox"
            icon={<CircleDot className="h-4 w-4 text-success" />}
            label="OX 퀴즈"
          />
          <MenuLink
            href="/timer"
            icon={<Clock className="h-4 w-4 text-warning" />}
            label="타이머 모드"
          />
          <MenuLink
            href="/review"
            icon={<FileX className="h-4 w-4 text-danger" />}
            label="오답노트"
          />
          <MenuLink
            href="/search"
            icon={<Search className="h-4 w-4 text-info" />}
            label="문항 검색"
          />
          <MenuLink
            href="/practice"
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            label="전체 문항 보기"
          />
        </div>
      </section>

      {/* Settings */}
      <section>
        <h2 className="text-sm font-bold text-foreground mb-3">설정</h2>
        <div className="space-y-2">
          {/* Theme Toggle */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-3 mb-2.5">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-primary" />
              ) : theme === "light" ? (
                <Sun className="h-4 w-4 text-warning" />
              ) : (
                <Monitor className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-card-foreground">화면 모드</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1">
              {([
                { key: "light" as const, label: "라이트", icon: Sun },
                { key: "dark" as const, label: "다크", icon: Moon },
                { key: "system" as const, label: "시스템", icon: Monitor },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${
                    theme === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Push Notification */}
          {permission !== "unsupported" && (
          <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  학습 알림
                </p>
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
          )}

          {/* Premium / 강의실 */}
          <PremiumSection />

          {/* Data Reset */}
          <ResetButton user={user} />
        </div>
      </section>

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
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  sub: string;
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
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${bgMap[color]} ${colorMap[color]}`}
        >
          {icon}
        </span>
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>
        {value}
        <span className="text-xs font-normal text-muted-foreground ml-0.5">
          {unit}
        </span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </motion.div>
  );
}

function MenuLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-sm font-medium text-card-foreground hover:border-primary/30 hover:shadow-sm transition-all"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// 수강생 / 강의실 섹션
// ---------------------------------------------------------------------------

function PremiumSection() {
  const { isPremium, expiresAt, loading } = usePremium();
  const [showEnroll, setShowEnroll] = useState(false);
  const [code, setCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState<string | null>(null);

  if (loading) return null;

  // 이미 premium → 강의실 입장 버튼
  if (isPremium) {
    return (
      <Link
        href="/class"
        className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-sm font-medium text-primary hover:bg-primary/10 transition-all"
      >
        <GraduationCap className="h-4 w-4" />
        <div className="flex-1">
          <p className="font-bold">강의실 입장</p>
          {expiresAt && (
            <p className="text-[10px] text-primary/70">
              {new Date(expiresAt).toLocaleDateString("ko-KR")}까지
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4" />
      </Link>
    );
  }

  // premium 아님 → 수강 코드 입력
  async function handleEnroll() {
    if (!code.trim() || enrolling) return;
    setEnrolling(true);
    setEnrollResult(null);

    try {
      const supabase = getSupabase();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      const token = session?.access_token;
      if (!token) {
        setEnrollResult("인증 정보가 없습니다.");
        setEnrolling(false);
        return;
      }

      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEnrollResult(data.error || "오류가 발생했습니다.");
        setEnrolling(false);
        return;
      }

      setEnrollResult("수강생으로 등록되었습니다!");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setEnrollResult("네트워크 오류가 발생했습니다.");
      setEnrolling(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-card-foreground">수강 코드</p>
            <p className="text-[10px] text-muted-foreground">수강생 전용 강의실에 입장합니다</p>
          </div>
        </div>
        <button
          onClick={() => setShowEnroll(!showEnroll)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
        >
          {showEnroll ? "닫기" : "입력"}
        </button>
      </div>
      {showEnroll && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="JT-XXXX"
            maxLength={7}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleEnroll}
            disabled={!code.trim() || enrolling}
            className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {enrolling ? "확인 중..." : "등록"}
          </button>
          {enrollResult && (
            <p className={`text-xs text-center font-medium ${enrollResult.includes("등록") ? "text-success" : "text-danger"}`}>
              {enrollResult}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 학습 데이터 초기화 버튼 + 확인 모달
// ---------------------------------------------------------------------------

function ResetButton({ user }: { user: { id: string } }) {
  const [showModal, setShowModal] = useState(false);
  const [scope, setScope] = useState<"solve" | "all">("solve");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const canConfirm = confirmText === "초기화";

  async function handleReset() {
    if (!canConfirm || loading) return;
    setLoading(true);
    setResult(null);

    try {
      // supabase session에서 access_token 가져오기
      const supabase = getSupabase();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;
      if (!token) {
        setResult("인증 정보가 없습니다. 다시 로그인해주세요.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scope }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(data.error || "오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      // scope=all → localStorage/IndexedDB도 클리어
      if (scope === "all") {
        try {
          localStorage.removeItem("jt-gichul-bookmarks");
          // IndexedDB 캐시 삭제
          const dbs = await indexedDB.databases();
          for (const db of dbs) {
            if (db.name) indexedDB.deleteDatabase(db.name);
          }
        } catch {
          // 브라우저 지원 안 되면 무시
        }
      }

      setResult("초기화가 완료되었습니다. 페이지를 새로고침합니다...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setResult("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-danger/20 bg-card p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="h-4 w-4 text-danger" />
          <div>
            <p className="text-sm font-medium text-card-foreground">학습 데이터 초기화</p>
            <p className="text-[10px] text-muted-foreground">풀이 기록을 삭제하고 처음부터 시작합니다</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setConfirmText("");
            setResult(null);
            setScope("solve");
          }}
          className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors"
        >
          초기화
        </button>
      </div>

      {/* 확인 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl"
          >
            {/* 헤더 */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              <h3 className="text-base font-bold text-foreground">학습 데이터 초기화</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              이 작업은 <span className="font-bold text-danger">되돌릴 수 없습니다.</span> 삭제된 데이터는 복구할 수 없으니 신중하게 결정해주세요.
            </p>

            {/* 범위 선택 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">초기화 범위</p>
              <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${scope === "solve" ? "border-primary bg-primary/5" : "border-border"}`}>
                <input
                  type="radio"
                  name="resetScope"
                  checked={scope === "solve"}
                  onChange={() => setScope("solve")}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">풀이 기록만</p>
                  <p className="text-[10px] text-muted-foreground">풀이 기록, OX 기록만 삭제 (북마크·설정 유지)</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${scope === "all" ? "border-danger bg-danger/5" : "border-border"}`}>
                <input
                  type="radio"
                  name="resetScope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="mt-0.5 accent-danger"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">전체 초기화</p>
                  <p className="text-[10px] text-muted-foreground">풀이·뱃지·스트릭·AI 사용량·북마크 모두 삭제</p>
                </div>
              </label>
            </div>

            {/* 확인 텍스트 입력 */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                확인을 위해 <span className="font-bold text-foreground">&quot;초기화&quot;</span>를 입력해주세요.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="초기화"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-danger/50"
              />
            </div>

            {/* 결과 메시지 */}
            {result && (
              <p className={`text-xs font-medium ${result.includes("완료") ? "text-success" : "text-danger"}`}>
                {result}
              </p>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleReset}
                disabled={!canConfirm || loading}
                className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-bold text-white hover:bg-danger/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? "처리 중..." : "초기화 실행"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 강의실 배너 — 프로필 바로 아래, 눈에 잘 띄는 위치
// ---------------------------------------------------------------------------

function ClassroomBanner() {
  const { isPremium, expiresAt, loading } = usePremium();

  if (loading) return null;

  // premium 사용자: 강의실 바로 입장
  if (isPremium) {
    return (
      <Link
        href="/class"
        className="flex items-center gap-3 rounded-2xl border border-success/30 bg-gradient-to-r from-success/5 to-success/10 p-4 shadow-sm transition-all hover:shadow-md hover:border-success/50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-card-foreground">JT 강의실</p>
          <p className="text-[10px] text-muted-foreground">
            공지 · Q&A · 자료
            {expiresAt && (
              <span className="ml-1 text-success/70">
                ({new Date(expiresAt).toLocaleDateString("ko-KR")}까지)
              </span>
            )}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-success" />
      </Link>
    );
  }

  // 비수강생: 강의실 안내 + 입장 유도
  return (
    <Link
      href="/class"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-card-foreground">JT 강의실</p>
        <p className="text-[10px] text-muted-foreground">수강 코드를 입력하고 강의실에 입장하세요</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
