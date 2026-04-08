import { ImageResponse } from "next/og";
import * as fs from "fs";
import * as path from "path";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Question, ChunkMeta } from "@/types/question";

export const alt = "JT기출 문항";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getQuestion(no: number): Question | null {
  const metaPath = path.join(process.cwd(), "public/data/questions/meta.json");
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  const chunk = meta.chunks.find((c) => no >= c.start_no && no <= c.end_no);
  if (!chunk) return null;
  const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
  const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, "utf-8"));
  return questions.find((q) => q.no === no) ?? null;
}

export default async function OGImage({ params }: { params: Promise<{ no: string }> }) {
  const { no: noStr } = await params;
  const no = parseInt(noStr, 10);
  const q = getQuestion(no);

  const logoData = await readFile(join(process.cwd(), "public/icons/icon-512.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  if (!q) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "white",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          JT기출 — 문항을 찾을 수 없습니다
        </div>
      ),
      { ...size }
    );
  }

  const diff = q.analysis.difficulty;
  const rate = q.analysis.estimated_correct_rate;
  const difficultyBars = Array.from({ length: 5 }, (_, i) => i < diff);
  const questionText =
    q.문제_내용.length > 80 ? q.문제_내용.slice(0, 80) + "..." : q.문제_내용;

  // Challenge messaging based on difficulty
  const challengeText = rate <= 40
    ? `정답률 ${rate}% — 이 문제 맞힐 수 있어?`
    : rate <= 60
    ? `절반은 틀리는 문항 (정답률 ${rate}%)`
    : `정답률 ${rate}% — 도전해보세요`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={logoBase64} width={40} height={40} style={{ borderRadius: "10px" }} />
            <span style={{ fontSize: 22, fontWeight: 800 }}>JT기출</span>
          </div>
          <span
            style={{
              fontSize: 18,
              background: "#4f46e5",
              padding: "8px 20px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            {q.시험_구분} {q.직급} {q.시행년도}
          </span>
        </div>

        {/* Category + Difficulty */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: 26, color: "#818cf8", fontWeight: 700 }}>{q.대분류}</span>
          <span style={{ fontSize: 20, color: "#64748b" }}>›</span>
          <span style={{ fontSize: 20, color: "#94a3b8" }}>{q.중분류}</span>
        </div>

        {/* Question text */}
        <div
          style={{
            fontSize: 26,
            lineHeight: "1.5",
            color: "#e2e8f0",
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {questionText}
        </div>

        {/* Challenge CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: rate <= 40 ? "#dc2626" : rate <= 60 ? "#d97706" : "#4f46e5",
            borderRadius: "16px",
            padding: "16px 32px",
            marginBottom: "24px",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {challengeText}
        </div>

        {/* Bottom stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "24px", fontSize: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#64748b" }}>난이도</span>
              <div style={{ display: "flex", gap: "3px" }}>
                {difficultyBars.map((filled, i) => (
                  <div
                    key={i}
                    style={{
                      width: "20px",
                      height: "6px",
                      borderRadius: "3px",
                      background: filled ? "#818cf8" : "#334155",
                    }}
                  />
                ))}
              </div>
            </div>
            <span style={{ color: "#64748b" }}>#{q.문제번호}</span>
          </div>
          <span style={{ fontSize: 16, color: "#64748b" }}>gichul.jttax.co.kr</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
