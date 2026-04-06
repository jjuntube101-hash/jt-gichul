"use client";

import { BADGES, getBadgeDef } from "@/lib/badges";

interface Props {
  earnedIds: Set<string>;
  showAll?: boolean;
}

export default function BadgeGrid({ earnedIds, showAll = false }: Props) {
  const list = showAll ? BADGES : BADGES.filter((b) => earnedIds.has(b.id));

  if (list.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        아직 획득한 뱃지가 없습니다. 문제를 풀어 뱃지를 모아보세요!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2">
      {list.map((badge) => {
        const earned = earnedIds.has(badge.id);
        return (
          <div
            key={badge.id}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${
              earned
                ? "bg-primary-light"
                : "bg-muted opacity-40"
            }`}
            title={badge.description}
          >
            <span className="text-2xl" role="img" aria-label={badge.name}>
              {badge.icon}
            </span>
            <span className={`text-[9px] font-medium text-center leading-tight ${
              earned ? "text-primary" : "text-muted-foreground"
            }`}>
              {badge.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
