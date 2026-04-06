"use client";

import { useAppStore } from "@/stores/appStore";
import type { SubjectType } from "@/types/question";

interface Props {
  className?: string;
}

const TABS: { key: SubjectType; label: string }[] = [
  { key: "tax", label: "세법" },
  { key: "accounting", label: "회계" },
];

export default function SubjectTabs({ className }: Props) {
  const subject = useAppStore((s) => s.subject);
  const setSubject = useAppStore((s) => s.setSubject);

  return (
    <div className={`flex rounded-xl bg-muted p-1 gap-1 ${className ?? ""}`}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setSubject(tab.key)}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            subject === tab.key
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
