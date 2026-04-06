"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBadgeDef } from "@/lib/badges";

interface Props {
  badgeIds: string[];
  onDismiss: () => void;
}

export default function BadgeToast({ badgeIds, onDismiss }: Props) {
  useEffect(() => {
    if (badgeIds.length === 0) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [badgeIds, onDismiss]);

  return (
    <AnimatePresence>
      {badgeIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2"
          onClick={onDismiss}
        >
          <div className="rounded-2xl bg-card border border-primary/20 shadow-float px-5 py-3 flex items-center gap-3">
            <div className="flex -space-x-1">
              {badgeIds.map((id) => {
                const badge = getBadgeDef(id);
                return (
                  <span key={id} className="text-2xl">
                    {badge?.icon ?? "🏅"}
                  </span>
                );
              })}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                뱃지 획득!
              </p>
              <p className="text-[10px] text-muted-foreground">
                {badgeIds.map((id) => getBadgeDef(id)?.name).join(", ")}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
