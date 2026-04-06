"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loadDailyQuests, type DailyQuestState, type Quest } from "@/lib/dailyQuest";

const TYPE_COLORS = {
  easy: { bg: "bg-success-light", text: "text-success", bar: "bg-success" },
  medium: { bg: "bg-warning-light", text: "text-warning", bar: "bg-warning" },
  hard: { bg: "bg-danger-light", text: "text-danger", bar: "bg-danger" },
};

const TYPE_LABELS = { easy: "쉬움", medium: "보통", hard: "어려움" };

export default function DailyQuestCard() {
  const { user } = useAuth();
  const [state, setState] = useState<DailyQuestState | null>(null);

  useEffect(() => {
    if (!user) return;
    setState(loadDailyQuests());

    // 탭 포커스 시 최신 상태 반영 (다른 페이지에서 풀이 후 돌아올 때)
    function handleFocus() {
      setState(loadDailyQuests());
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  if (!user || !state) return null;

  const completed = state.quests.filter(q => q.completed).length;
  const allDone = completed === 3;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Star className="h-4 w-4 text-warning" />
          오늘의 퀘스트
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground">
          {completed}/3 완료
        </span>
      </div>

      <div className="space-y-2">
        {state.quests.map((quest, idx) => (
          <QuestRow key={quest.id} quest={quest} index={idx} />
        ))}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 p-3 text-center"
        >
          <p className="text-xs font-bold text-success">
            <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />
            퀘스트 올클리어!
          </p>
        </motion.div>
      )}
    </div>
  );
}

function QuestRow({ quest, index }: { quest: Quest; index: number }) {
  const colors = TYPE_COLORS[quest.type];
  const percent = Math.min((quest.current / quest.target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-xl p-3 ${quest.completed ? "opacity-60" : ""} ${colors.bg}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {quest.completed ? (
            <CheckCircle2 className={`h-3.5 w-3.5 ${colors.text}`} />
          ) : (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              {TYPE_LABELS[quest.type]}
            </span>
          )}
          <span className={`text-xs font-medium ${quest.completed ? "line-through text-muted-foreground" : "text-card-foreground"}`}>
            {quest.title}
          </span>
        </div>
        <span className={`text-[10px] font-bold ${colors.text}`}>
          {quest.current}/{quest.target}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-card/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
        />
      </div>
    </motion.div>
  );
}
