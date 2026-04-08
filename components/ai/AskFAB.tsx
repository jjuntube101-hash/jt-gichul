"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/appStore";
import AskChat from "./AskChat";

export default function AskFAB() {
  const [open, setOpen] = useState(false);
  const isFocusMode = useAppStore((s) => s.isFocusMode);

  // 포커스 모드일 때 숨김
  if (isFocusMode) return null;

  return (
    <>
      {/* 플로팅 버튼 */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
            aria-label="JT 튜터에게 질문하기"
          >
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
            {/* 스파클 뱃지 */}
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[8px] font-bold text-white" aria-hidden="true">
              AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 채팅 바텀시트 */}
      <AskChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}
