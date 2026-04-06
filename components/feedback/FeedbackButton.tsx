"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, X, Send, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Category = "bug" | "feature" | "ui" | "other";

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: "bug", label: "버그", emoji: "🐛" },
  { key: "feature", label: "기능 요청", emoji: "💡" },
  { key: "ui", label: "UI/UX", emoji: "🎨" },
  { key: "other", label: "기타", emoji: "💬" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open]);

  // 완료 후 자동 닫기
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => {
        setDone(false);
        setOpen(false);
        setContent("");
        setCategory("bug");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [done]);

  async function handleSubmit() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("feedback").insert({
          user_id: user?.id ?? null,
          category,
          content: content.trim(),
          page_url: window.location.pathname,
          user_agent: navigator.userAgent,
          screen_size: `${window.innerWidth}x${window.innerHeight}`,
        });
      }
      setDone(true);
    } catch {
      alert("피드백 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors"
            aria-label="피드백 보내기"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop + Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setOpen(false)}
              className="fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border shadow-xl max-h-[80vh] overflow-y-auto"
            >
              {done ? (
                /* 완료 화면 */
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <CheckCircle className="h-12 w-12 text-success" />
                  <p className="text-base font-bold text-foreground">감사합니다!</p>
                  <p className="text-sm text-muted-foreground">피드백이 전달되었습니다</p>
                </div>
              ) : (
                /* 입력 폼 */
                <div className="p-5 pb-24 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground">피드백 보내기</h2>
                    <button
                      onClick={() => setOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Category */}
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setCategory(cat.key)}
                        className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                          category === cat.key
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="text-base">{cat.emoji}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      category === "bug"
                        ? "어떤 문제가 있나요? 구체적으로 알려주세요."
                        : category === "feature"
                        ? "어떤 기능이 있으면 좋겠나요?"
                        : category === "ui"
                        ? "UI/UX 개선 의견을 알려주세요."
                        : "자유롭게 의견을 남겨주세요."
                    }
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />

                  {/* Info */}
                  <p className="text-[10px] text-muted-foreground">
                    현재 페이지: {typeof window !== "undefined" ? window.location.pathname : ""} · {content.length}/1000
                  </p>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {submitting ? "전송 중..." : "보내기"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
