import RoadmapTimeline from "./RoadmapTimeline";

export const metadata = {
  title: "학습 로드맵 — JT기출",
  description: "주차별 학습 커리큘럼과 진행률을 확인하세요.",
};

export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold text-foreground">학습 로드맵</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          시험 목표에 맞춘 주차별 커리큘럼
        </p>
      </section>
      <RoadmapTimeline />
    </div>
  );
}
