"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, BookOpen } from "lucide-react";
import type { TopicEntry, SubjectType } from "@/types/question";

type Categories = {
  [taxType: string]: {
    [law: string]: {
      [topic: string]: TopicEntry;
    };
  };
};

interface Props {
  categories: Categories;
  subject?: SubjectType;
}

export default function CategoryTree({ categories, subject }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null);

  const entries = Object.entries(categories);
  const subjectQuery = subject === "accounting" ? "&subject=accounting" : "";

  return (
    <section className="space-y-3">
      <button
        onClick={() => setShowAll(!showAll)}
        className="flex w-full items-center justify-between"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          과목별 문제
        </h2>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {showAll ? "접기" : "펼치기"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
        </span>
      </button>

      {showAll && (
        <div className="space-y-4">
          {entries.map(([taxType, laws]) => (
            <div key={taxType} className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <span className="h-3 w-0.5 rounded-full bg-primary" />
                {taxType}
              </p>

              {Object.entries(laws).map(([lawName, topics]) => {
                const topicEntries = Object.entries(topics);
                const totalCount = topicEntries.reduce((sum, [, t]) => sum + t.total, 0);
                const isExpanded = expandedLaw === lawName;

                return (
                  <div key={lawName}>
                    <button
                      onClick={() => setExpandedLaw(isExpanded ? null : lawName)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground">{lawName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{totalCount}문항</span>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-1.5 space-y-1">
                        <Link href={`/practice?law=${encodeURIComponent(lawName)}${subjectQuery}`}>
                          <div className="rounded-lg bg-primary-light px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
                            {lawName} 전체 {totalCount}문항 풀기 →
                          </div>
                        </Link>
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {topicEntries.map(([topicName, t]) => (
                            <Link
                              key={topicName}
                              href={`/practice?law=${encodeURIComponent(lawName)}&topic=${encodeURIComponent(topicName)}${subjectQuery}`}
                            >
                              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary">
                                {topicName}
                                <span className="text-[10px] opacity-60">{t.total}</span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
