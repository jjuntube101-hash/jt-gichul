import type { MetadataRoute } from "next";
import * as fs from "fs";
import * as path from "path";
import type { ChunkMeta, Question } from "@/types/question";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gichul.jttax.co.kr";

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/practice`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/ox`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/timer`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // 문항 페이지 1,245개
  const metaPath = path.join(process.cwd(), "public/data/questions/meta.json");
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

  const questionPages: MetadataRoute.Sitemap = [];
  for (const chunk of meta.chunks) {
    const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
    const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, "utf-8"));
    for (const q of questions) {
      questionPages.push({
        url: `${baseUrl}/question/${q.no}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return [...staticPages, ...questionPages];
}
