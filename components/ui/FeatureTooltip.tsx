"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const STORAGE_KEY = "jt-gichul-tooltips-seen";

interface FeatureTooltipProps {
  /** 고유 ID — localStorage에 "본 적 있음" 기록용 */
  id: string;
  /** 안내 텍스트 */
  message: string;
  /** 툴팁이 가리킬 방향 */
  position?: "top" | "bottom";
  /** children을 감싸서 표시 */
  children: React.ReactNode;
}

function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  const seen = getSeenIds();
  seen.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

export default function FeatureTooltip({
  id,
  message,
  position = "bottom",
  children,
}: FeatureTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 500ms 딜레이 후 표시 (페이지 로드 직후 깜빡임 방지)
    const timer = setTimeout(() => {
      const seen = getSeenIds();
      if (!seen.has(id)) {
        setVisible(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  const dismiss = useCallback(() => {
    setVisible(false);
    markSeen(id);
  }, [id]);

  // 5초 후 자동 닫힘
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: position === "bottom" ? -4 : 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === "bottom" ? -4 : 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute left-1/2 -translate-x-1/2 z-50 ${
              position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
            }`}
          >
            <div className="relative flex items-start gap-2 rounded-lg bg-primary px-3 py-2 shadow-float max-w-[260px]">
              {/* Arrow */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-primary ${
                  position === "bottom" ? "-top-1" : "-bottom-1"
                }`}
              />
              <p className="text-xs text-white leading-relaxed flex-1">
                {message}
              </p>
              <button
                onClick={dismiss}
                className="shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-3 w-3 text-white/80" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 모든 툴팁 리셋 (개발/테스트용) */
export function resetAllTooltips() {
  localStorage.removeItem(STORAGE_KEY);
}
