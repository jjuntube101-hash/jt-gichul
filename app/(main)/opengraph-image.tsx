import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "JT기출 — 공무원 세법 기출 학습";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const logoData = await readFile(join(process.cwd(), "public/icons/icon-512.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* JT 로고 */}
        <img
          src={logoBase64}
          width={120}
          height={120}
          style={{ borderRadius: "24px", marginBottom: "24px" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 800 }}>JT기출</span>
          <span style={{ fontSize: 28, color: "#94a3b8" }}>세법</span>
        </div>
        <div style={{ fontSize: 32, color: "#e2e8f0", marginBottom: "16px" }}>
          공무원 세법 기출 1,245문항 전수분석
        </div>
        <div style={{ fontSize: 20, color: "#94a3b8" }}>
          선지별 정오판 · 근거조문 · 함정유형 · 출제의도
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "48px",
            fontSize: 18,
            color: "#64748b",
          }}
        >
          <span>이현준 세무사</span>
          <span>·</span>
          <span>gichul.jttax.co.kr</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
