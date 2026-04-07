"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAskAI } from "@/hooks/useAskAI";
import Link from "next/link";

const SUGGESTED_QUESTIONS = [
  "양도소득세 과세대상이 뭔가요?",
  "면세와 영세율의 차이가 헷갈려요",
  "가산세 종류를 정리해주세요",
  "공부가 너무 힘들어요...",
];

export default function AskChat({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { messages, isLoading, error, remaining, sendQuestion, clearChat } =
    useAskAI();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 새 메시지 시 스크롤 하단으로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // 열릴 때 인풋 포커스
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    sendQuestion(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (q: string) => {
    setInput("");
    sendQuestion(q);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />

          {/* 바텀시트 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card rounded-t-2xl shadow-2xl"
            style={{ maxHeight: "85vh" }}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                {/* 세무사 아바타 */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-bold shadow-sm">
                  JT
                </div>
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">
                    JT 튜터
                  </h2>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <p className="text-[10px] text-muted-foreground">
                      답변 가능
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {remaining !== null && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {remaining}회 남음
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* 비로그인 */}
            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white text-xl font-bold">
                  JT
                </div>
                <p className="text-sm font-medium text-foreground">
                  JT 튜터에게 질문하기
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  세법·회계 궁금한 점을 물어보세요.<br />
                  로그인하면 바로 답변을 받을 수 있습니다.
                </p>
                <Link
                  href="/login"
                  onClick={onClose}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white mt-1"
                >
                  로그인하기
                </Link>
              </div>
            ) : (
              <>
                {/* 메시지 영역 */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                  style={{ minHeight: "200px" }}
                >
                  {/* 초기 상태 — 인사 + 추천 질문 */}
                  {messages.length === 0 && !isLoading && (
                    <div className="space-y-4 pt-2">
                      {/* 세무사 인사 메시지 */}
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white text-[10px] font-bold mt-0.5">
                          JT
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 max-w-[85%]">
                          <p className="text-xs text-foreground leading-relaxed">
                            안녕하세요! JT 튜터입니다.<br />
                            세법·회계 공부하다 궁금한 거 있으면 편하게 물어보세요.
                            시험에 나오는 포인트 위주로 알려드릴게요.
                          </p>
                          <p className="text-xs text-foreground leading-relaxed mt-2">
                            공부하다 힘든 것도 얘기해주세요. 같이 이야기 나눠봐요.
                          </p>
                        </div>
                      </div>

                      {/* 추천 질문 */}
                      <div className="pl-9">
                        <p className="text-[10px] text-muted-foreground mb-2">
                          이런 것들을 물어보세요
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTED_QUESTIONS.map((q) => (
                            <button
                              key={q}
                              onClick={() => handleSuggestion(q)}
                              className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] text-primary hover:bg-primary/10 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 메시지들 */}
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === "user"
                          ? "justify-end"
                          : "items-start gap-2"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-white leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      ) : (
                        <>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white text-[10px] font-bold mt-0.5">
                            JT
                          </div>
                          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                            <MarkdownContent content={msg.content} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* 로딩 인디케이터 */}
                  {isLoading && (
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white text-[10px] font-bold mt-0.5">
                        JT
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 에러 */}
                  {error && (
                    <div className="rounded-xl border border-danger/20 bg-danger-light p-3">
                      <p className="text-xs text-danger">{error}</p>
                    </div>
                  )}
                </div>

                {/* 입력 영역 */}
                <div className="border-t border-border p-3 pb-safe">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="궁금한 점을 물어보세요..."
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 max-h-24"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity"
                      aria-label="전송"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                    하루 3회 무료 질문
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** 간단한 마크다운 렌더러 */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="text-xs font-bold text-foreground mt-2 mb-0.5">
          {formatInline(line.slice(4))}
        </p>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="text-sm font-bold text-foreground mt-2 mb-0.5">
          {formatInline(line.slice(3))}
        </p>
      );
      continue;
    }

    if (line.match(/^[-*] /)) {
      elements.push(
        <p key={i} className="text-xs text-foreground leading-relaxed pl-2">
          <span className="text-muted-foreground mr-1">&#8226;</span>
          {formatInline(line.slice(2))}
        </p>
      );
      continue;
    }

    if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)/);
      if (match) {
        elements.push(
          <p key={i} className="text-xs text-foreground leading-relaxed pl-2">
            <span className="text-muted-foreground mr-1">{match[1]}.</span>
            {formatInline(match[2])}
          </p>
        );
        continue;
      }
    }

    elements.push(
      <p key={i} className="text-xs text-foreground leading-relaxed">
        {formatInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
