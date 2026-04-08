"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Reply, Trash2, Pin, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

interface Comment {
  id: string;
  question_no: number;
  parent_id: string | null;
  body: string;
  is_official: boolean;
  is_pinned: boolean;
  created_at: string;
  authorName: string;
  isAdmin: boolean;
  isOwner: boolean;
}

export default function CommentThread({
  questionNo,
}: {
  questionNo: number;
}) {
  useAuth(); // 인증 상태 확인
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getToken = useCallback(async () => {
    const supabase = getSupabase();
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    return session?.access_token ?? null;
  }, []);

  const loadComments = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(
        `/api/comments?no=${questionNo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }, [questionNo, getToken]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const token = await getToken();
    if (!token) { setSubmitting(false); return; }

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionNo,
          body: body.trim(),
          parentId: replyTo ?? undefined,
        }),
      });

      if (res.ok) {
        setBody("");
        setReplyTo(null);
        await loadComments();
      }
    } catch {
      // 무시
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(commentId: string, action: "delete" | "pin" | "unpin") {
    const token = await getToken();
    if (!token) return;
    await fetch("/api/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ commentId, action }),
    });
    await loadComments();
  }

  // 댓글을 부모/자식으로 정렬
  const rootComments = comments.filter((c) => !c.parent_id);
  const childMap = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const children = childMap.get(c.parent_id) ?? [];
      children.push(c);
      childMap.set(c.parent_id, children);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 py-4">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 댓글 목록 */}
      {rootComments.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">
          아직 댓글이 없습니다. 첫 번째 질문을 남겨보세요!
        </p>
      ) : (
        <div className="space-y-3">
          {rootComments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                onReply={() => setReplyTo(comment.id)}
                onAction={handleAction}
              />
              {/* 대댓글 */}
              {childMap.get(comment.id)?.map((child) => (
                <div key={child.id} className="ml-6 mt-1.5">
                  <CommentCard
                    comment={child}
                    onAction={handleAction}
                    isReply
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 댓글 입력 */}
      <div className="border-t border-border pt-3">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2">
            <Reply className="h-3 w-3 text-primary" />
            <span className="text-[10px] text-primary font-medium">
              답글 작성 중
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground ml-auto"
            >
              취소
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="질문이나 의견을 남겨보세요..."
            maxLength={1000}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="rounded-xl bg-primary px-4 py-2.5 text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  onReply,
  onAction,
  isReply = false,
}: {
  comment: Comment;
  onReply?: () => void;
  onAction: (id: string, action: "delete" | "pin" | "unpin") => void;
  isReply?: boolean;
}) {
  const isOwner = comment.isOwner;
  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div
      className={`rounded-xl border p-3 ${
        comment.is_pinned
          ? "border-primary/30 bg-primary/5"
          : comment.is_official
          ? "border-success/30 bg-success/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {comment.is_pinned && <Pin className="h-3 w-3 text-primary" />}
        {comment.isAdmin && (
          <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            <Shield className="h-2.5 w-2.5" />
            강사
          </span>
        )}
        <span className="text-xs font-medium text-foreground">
          {comment.isAdmin ? "이현준 세무사" : comment.authorName}
        </span>
        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
      </div>

      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {comment.body}
      </p>

      <div className="flex items-center gap-2 mt-2">
        {!isReply && onReply && (
          <button
            onClick={onReply}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Reply className="h-3 w-3" />
            답글
          </button>
        )}
        {isOwner && (
          <button
            onClick={() => onAction(comment.id, "delete")}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-danger transition-colors ml-auto"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}
