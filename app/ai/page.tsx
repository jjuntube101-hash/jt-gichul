"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Eye,
  BookOpen,
  GitCompareArrows,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "출제자의 눈",
    desc: "토픽별 출제 빈도, 함정 패턴, 연도별 추이를 한눈에",
    icon: <Eye className="h-5 w-5" />,
    href: "/ai/exam-patterns",
    color: "primary" as const,
    stat: "120개 토픽",
  },
  {
    title: "함정 패턴 훈련소",
    desc: "반대진술, 수치변조 등 출제자가 즐겨 쓰는 함정 유형 분석",
    icon: <ShieldAlert className="h-5 w-5" />,
    href: "/ai/traps",
    color: "warning" as const,
    stat: "10가지 유형",
  },
  {
    title: "유사 문항 비교",
    desc: "같은 조문이 연도별로 어떻게 변형되었는지 추적",
    icon: <GitCompareArrows className="h-5 w-5" />,
    href: "/ai/similar",
    color: "info" as const,
    stat: "443개 그룹",
  },
  {
    title: "조문 암기 카드",
    desc: "기출 선지에서 추출한 OX 플래시카드로 조문 암기",
    icon: <BookOpen className="h-5 w-5" />,
    href: "/ai/flashcards",
    color: "success" as const,
    stat: "2,783장",
  },
];

const colorMap = {
  primary: { text: "text-primary", bg: "bg-primary-light" },
  warning: { text: "text-warning", bg: "bg-warning-light" },
  info: { text: "text-info", bg: "bg-info-light" },
  success: { text: "text-success", bg: "bg-success-light" },
};

export default function AIHubPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">AI 학습 도구</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          2,065문항 전수분석 기반. API 비용 없이 즉시 사용 가능한 정적 분석 도구.
        </p>
      </motion.div>

      <div className="space-y-3">
        {features.map((f, i) => {
          const c = colorMap[f.color];
          return (
            <motion.div
              key={f.href}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href={f.href}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow hover:border-primary/20 transition-all group"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} ${c.text} shrink-0`}
                >
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">
                      {f.title}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.bg} ${c.text}`}
                    >
                      {f.stat}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.desc}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
