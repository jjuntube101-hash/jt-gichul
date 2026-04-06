"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, signInWithKakao, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace("/mypage");
    return null;
  }

  async function handleKakao() {
    setError(null);
    await signInWithKakao();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signInWithEmail(email, password);
        if (result?.error) {
          setError(
            result.error.message === "Invalid login credentials"
              ? "이메일 또는 비밀번호가 올바���지 않습니다."
              : result.error.message
          );
        } else {
          router.replace("/mypage");
        }
      } else {
        const result = await signUpWithEmail(email, password);
        if (result?.error) {
          setError(result.error.message);
        } else {
          setMessage("인증 메일을 보냈습니다. 메일함을 확인해주세요!");
        }
      }
    } catch {
      setError("오류가 발생��습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 py-8"
    >
      <div className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-jt.png" alt="JT" width={64} height={64} />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          로그인하면 풀이 기록이 저장됩니다
        </p>
      </div>

      {/* Kakao */}
      <button
        onClick={handleKakao}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 text-sm font-bold text-[#191919] transition-colors hover:bg-[#FDD835]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.44 4.08 3.62 5.17-.16.57-.58 2.07-.66 2.39-.1.39.14.39.3.28.12-.08 1.94-1.32 2.72-1.86.63.09 1.3.14 1.98.14 4.42 0 8-2.79 8-6.21C17 3.79 13.42 1 9 1"
            fill="#191919"
          />
        </svg>
        카카오로 시작하기
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">또는</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email */}
      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@email.com"
            className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="6자 이상"
            className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-danger-light p-3 text-xs text-danger">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl bg-success-light p-3 text-xs text-success">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading
            ? "처리 중..."
            : mode === "login"
            ? "이메일로 ��그인"
            : "회원가입"}
        </button>
      </form>

      <div className="text-center">
        {mode === "login" ? (
          <button
            onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            계정이 없으신가요?{" "}
            <span className="font-medium text-primary underline">회원가입</span>
          </button>
        ) : (
          <button
            onClick={() => { setMode("login"); setError(null); setMessage(null); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            이미 계정이 있으신가요?{" "}
            <span className="font-medium text-primary underline">로그인</span>
          </button>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          로그인 없이 둘러보기
        </Link>
      </div>
    </motion.div>
  );
}
