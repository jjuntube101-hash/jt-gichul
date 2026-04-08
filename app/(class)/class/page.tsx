"use client";

import { useEffect, useState } from "react";
import { Bell, ExternalLink, Pin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  is_pinned: boolean;
  created_at: string;
}

export default function ClassHomePage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      if (!session?.access_token) return;

      try {
        const res = await fetch("/api/announce", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements ?? []);
        }
      } catch {
        // 무시
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-4 h-20"
          />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3">
        <Bell className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">아직 공지사항이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((ann) => (
        <article
          key={ann.id}
          className={`rounded-xl border bg-card p-4 transition-colors ${
            ann.is_pinned ? "border-primary/30 bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex items-start gap-2">
            {ann.is_pinned && (
              <Pin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">{ann.title}</h3>
              {ann.body && (
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {ann.body}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <time className="text-[10px] text-muted-foreground">
                  {new Date(ann.created_at).toLocaleDateString("ko-KR")}
                </time>
                {ann.link_url && (
                  <a
                    href={ann.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {ann.link_label || "자료 다운로드"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
