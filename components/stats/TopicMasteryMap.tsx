"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Map } from "lucide-react";
import { useTopicMastery, getLawCategory, type TopicMastery, type LawMastery, type LawCategory } from "@/hooks/useTopicMastery";
import { useAuth } from "@/hooks/useAuth";

const LEVEL_STYLES: Record<TopicMastery["level"], { bg: string; text: string; ring: string }> = {
  none: { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-muted" },
  red: { bg: "bg-danger-light", text: "text-danger", ring: "ring-danger/30" },
  yellow: { bg: "bg-warning-light", text: "text-warning", ring: "ring-warning/30" },
  green: { bg: "bg-success-light", text: "text-success", ring: "ring-success/30" },
  gold: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-400/40" },
};

export default function TopicMasteryMap() {
  const { user } = useAuth();
  const { data, loading } = useTopicMastery();

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-8 w-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Map className="h-4 w-4 text-primary" />
          학습 맵
        </h3>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-2 rounded-sm bg-muted" /> 미시도</span>
          <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-2 rounded-sm bg-danger" /> &lt;50</span>
          <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-2 rounded-sm bg-warning" /> 50~70</span>
          <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-2 rounded-sm bg-success" /> 70~90</span>
          <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> 90+</span>
        </div>
      </div>

      {/* 카테고리별 그룹 렌더링 */}
      {(["국세", "지방세", "회계"] as LawCategory[]).map((category) => {
        const laws = data.filter((l) => getLawCategory(l.law) === category);
        if (laws.length === 0) return null;

        const label =
          category === "국세" ? "세법 — 국세"
          : category === "지방세" ? "세법 — 지방세"
          : "회계";

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {label}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {laws.map((law, idx) => (
              <LawSection key={law.law} law={law} index={idx} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function LawSection({ law, index }: { law: LawMastery; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-card-foreground">{law.law}</span>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{law.totalSolved}문 풀이</span>
          {law.avgAccuracy > 0 && (
            <span className={
              law.avgAccuracy >= 70 ? "text-success font-bold"
                : law.avgAccuracy >= 50 ? "text-warning font-bold"
                : "text-danger font-bold"
            }>
              {law.avgAccuracy}%
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {law.topics.map(topic => (
          <TopicCell key={topic.topic} topic={topic} />
        ))}
      </div>
    </motion.div>
  );
}

function TopicCell({ topic }: { topic: TopicMastery }) {
  const style = LEVEL_STYLES[topic.level];

  return (
    <Link
      href={`/practice?law=${encodeURIComponent(topic.law)}&topic=${encodeURIComponent(topic.topic)}`}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] ring-1 transition-all hover:ring-2 ${style.bg} ${style.text} ${style.ring}`}
    >
      <span className="font-medium truncate max-w-[80px]">{topic.topic}</span>
      {topic.total > 0 && (
        <span className="font-bold">{topic.accuracy}%</span>
      )}
    </Link>
  );
}
