"use client";

import { useUserStage } from "@/hooks/useUserStage";
import QuickStartCTA from "@/components/engagement/QuickStartCTA";
import HomeEngagement from "@/components/engagement/HomeEngagement";
import DailyStudyPlan from "@/components/engagement/DailyStudyPlan";
import DailyQuestCard from "@/components/engagement/DailyQuestCard";
import WeeklyReport from "@/components/engagement/WeeklyReport";
import SpacedReviewCard from "@/components/engagement/SpacedReviewCard";
import RoadmapCard from "@/components/roadmap/RoadmapCard";
import StageHome from "@/components/home/StageHome";
import DailyBriefing from "@/components/engagement/DailyBriefing";
import FeatureTooltip from "@/components/ui/FeatureTooltip";

/**
 * 홈 화면 카드를 유저 단계에 따라 축소 렌더링.
 *
 * 비로그인: "1문제만!" CTA만
 * new (<10): StageHome(진행률+로드맵 미리보기) + "1문제만!"
 * regular (10~500): StageHome(브리핑+로드맵+약점) + 스트릭 + 간격 복습
 * power (500+): StageHome(브리핑+로드맵+약점토픽) + 스트릭 + 간격 복습 + 주간 보고서
 */
export default function HomeCards() {
  const { stage, loading } = useUserStage();

  if (loading) return null;

  // 비로그인: CTA만
  if (stage === "anonymous") {
    return (
      <>
        <QuickStartCTA />
      </>
    );
  }

  // 신규 (<10문항)
  if (stage === "new") {
    return (
      <>
        <StageHome />
        <FeatureTooltip id="new-cta" message="여기를 탭하면 랜덤 문제 1개를 바로 풀 수 있어요!">
          <QuickStartCTA />
        </FeatureTooltip>
      </>
    );
  }

  // 일반 (10~500)
  if (stage === "regular") {
    return (
      <>
        <StageHome />
        <FeatureTooltip id="briefing" message="매일 오늘의 학습 상태와 추천을 확인하세요" position="top">
          <DailyBriefing />
        </FeatureTooltip>
        <HomeEngagement />
        <SpacedReviewCard />
        <DailyStudyPlan />
      </>
    );
  }

  // 파워 (500+)
  return (
    <>
      <StageHome />
      <DailyBriefing />
      <HomeEngagement />
      <SpacedReviewCard />
      <DailyStudyPlan />
      <DailyQuestCard />
      <WeeklyReport />
    </>
  );
}
