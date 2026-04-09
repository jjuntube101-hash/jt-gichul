"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AdminAnnounceForm({ onSuccess, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      if (!session?.access_token) throw new Error("인증 필요");

      const res = await fetch("/api/announce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          link_url: linkUrl.trim() || null,
          link_label: linkLabel.trim() || null,
          is_pinned: isPinned,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "등록 실패");
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">공지 작성</span>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label="공지 작성 취소">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="제목"
        aria-label="공지 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
      />

      <textarea
        placeholder="내용 (선택)"
        aria-label="공지 내용"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none"
      />

      <div className="flex gap-2">
        <input
          type="url"
          placeholder="링크 URL (선택)"
          aria-label="링크 URL"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
        />
        <input
          type="text"
          placeholder="링크 라벨"
          aria-label="링크 라벨"
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          className="w-28 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="rounded"
        />
        상단 고정
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        {submitting ? "등록 중..." : "공지 등록"}
      </button>
    </form>
  );
}
