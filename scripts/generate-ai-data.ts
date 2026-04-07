/**
 * 사전 생성 AI 데이터 4종 생성 스크립트
 * - 출제자의 눈 (exam_patterns.json)
 * - 유사 문항 비교 (similar_questions.json)
 * - 함정 패턴 훈련소 (trap_patterns.json)
 * - 조문 암기 카드 (law_flashcards.json)
 *
 * 실행: npx tsx scripts/generate-ai-data.ts
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../public/data");
const Q_DIR = path.join(DATA_DIR, "questions");
const OUT_DIR = path.join(DATA_DIR, "ai");

interface Question {
  no: number;
  tax_type: string;
  시험_구분: string;
  직급: string;
  시행년도: number;
  문제번호: number;
  문제_내용: string;
  선택지: string[];
  정답: number;
  대분류: string;
  중분류: string;
  소분류: string;
  근거법령: string;
  analysis: {
    question_type: string;
    question_subtype: string;
    difficulty: number;
    estimated_correct_rate: number;
    choices_analysis: {
      choice_num: number;
      verdict: string;
      law_ref: string;
      analysis: string;
      trap_type: string | null;
      distortion: string | null;
    }[];
    intent: string;
    discrimination_point: string;
    trap_patterns: string[];
    keywords: string[];
    related_questions: number[];
    ox_convertible: boolean;
    ox_items?: { ox_text: string; answer: string; law_ref: string }[];
  };
}

// Load all questions
function loadAllQuestions(): Question[] {
  const meta = JSON.parse(fs.readFileSync(path.join(Q_DIR, "meta.json"), "utf-8"));
  const all: Question[] = [];
  for (const chunk of meta.chunks) {
    const data = JSON.parse(fs.readFileSync(path.join(Q_DIR, chunk.file), "utf-8"));
    all.push(...data);
  }
  return all;
}

// ============================
// 1. 출제자의 눈 (Exam Patterns)
// ============================
function generateExamPatterns(questions: Question[]) {
  const topicMap = new Map<string, {
    law: string;
    topic: string;
    total: number;
    by_grade: Record<string, number>;
    by_year: Record<number, number>;
    trap_types: Record<string, number>;
    avg_difficulty: number;
    avg_correct_rate: number;
    recent_5y: number;
    question_types: Record<string, number>;
  }>();

  for (const q of questions) {
    const key = `${q.대분류}::${q.중분류}`;
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        law: q.대분류,
        topic: q.중분류,
        total: 0,
        by_grade: {},
        by_year: {},
        trap_types: {},
        avg_difficulty: 0,
        avg_correct_rate: 0,
        recent_5y: 0,
        question_types: {},
      });
    }
    const t = topicMap.get(key)!;
    t.total++;
    t.by_grade[q.직급] = (t.by_grade[q.직급] || 0) + 1;
    t.by_year[q.시행년도] = (t.by_year[q.시행년도] || 0) + 1;
    t.avg_difficulty += q.analysis.difficulty;
    t.avg_correct_rate += q.analysis.estimated_correct_rate;
    if (q.시행년도 >= 2021) t.recent_5y++;

    // trap patterns
    for (const tp of q.analysis.trap_patterns) {
      t.trap_types[tp] = (t.trap_types[tp] || 0) + 1;
    }

    // question types
    const qt = q.analysis.question_subtype || q.analysis.question_type;
    t.question_types[qt] = (t.question_types[qt] || 0) + 1;
  }

  const result = Array.from(topicMap.values())
    .map((t) => ({
      law: t.law,
      topic: t.topic,
      total: t.total,
      recent_5y: t.recent_5y,
      avg_difficulty: Math.round((t.avg_difficulty / t.total) * 10) / 10,
      avg_correct_rate: Math.round(t.avg_correct_rate / t.total),
      by_grade: t.by_grade,
      by_year: t.by_year,
      top_traps: Object.entries(t.trap_types)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          ratio: Math.round((count / t.total) * 100),
        })),
      question_types: Object.entries(t.question_types)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    }))
    .sort((a, b) => b.total - a.total);

  return result;
}

// ============================
// 2. 유사 문항 비교 (Similar Questions)
// ============================
function generateSimilarQuestions(questions: Question[]) {
  const qMap = new Map<number, Question>();
  for (const q of questions) qMap.set(q.no, q);

  const groups: {
    base_no: number;
    related: number[];
    law: string;
    topic: string;
    years: number[];
    summary: string;
  }[] = [];

  const visited = new Set<number>();

  for (const q of questions) {
    if (visited.has(q.no)) continue;
    const related = q.analysis.related_questions;
    if (!related || related.length === 0) continue;

    // Build group
    const groupNos = [q.no, ...related].filter((no) => qMap.has(no));
    for (const no of groupNos) visited.add(no);

    const years = groupNos
      .map((no) => qMap.get(no)!.시행년도)
      .sort((a, b) => a - b);

    const uniqueYears = [...new Set(years)];

    groups.push({
      base_no: q.no,
      related: related.filter((no) => qMap.has(no)),
      law: q.대분류,
      topic: q.중분류,
      years: uniqueYears,
      summary: `${q.대분류} > ${q.중분류} — ${uniqueYears[0]}년~${uniqueYears[uniqueYears.length - 1]}년, ${groupNos.length}문항`,
    });
  }

  return groups.sort((a, b) => b.related.length - a.related.length);
}

// ============================
// 3. 함정 패턴 훈련소 (Trap Patterns)
// ============================
function generateTrapPatterns(questions: Question[]) {
  const trapMap = new Map<string, {
    name: string;
    count: number;
    examples: { no: number; choice: number; distortion: string; law: string; topic: string }[];
    laws: Record<string, number>;
  }>();

  for (const q of questions) {
    for (const c of q.analysis.choices_analysis) {
      if (!c.trap_type) continue;
      if (!trapMap.has(c.trap_type)) {
        trapMap.set(c.trap_type, { name: c.trap_type, count: 0, examples: [], laws: {} });
      }
      const t = trapMap.get(c.trap_type)!;
      t.count++;
      t.laws[q.대분류] = (t.laws[q.대분류] || 0) + 1;

      if (t.examples.length < 10) {
        t.examples.push({
          no: q.no,
          choice: c.choice_num,
          distortion: c.distortion || c.analysis,
          law: q.대분류,
          topic: q.중분류,
        });
      }
    }
  }

  const descriptions: Record<string, string> = {
    "반대진술": "법 조문의 '~할 수 있다'를 '~할 수 없다'로, '유효하다'를 '무효다'로 뒤집는 함정. 가장 빈번한 출제 패턴.",
    "수치변조": "기간, 금액, 비율 등 숫자를 살짝 바꾸는 함정. 5년→3년, 1억→5천만원 등.",
    "요건추가": "법에 없는 추가 요건을 슬쩍 끼워넣는 함정. '~한 경우에 한하여' 등 조건 추가.",
    "요건누락": "법에서 요구하는 요건 중 하나를 빼고 진술하는 함정. 필수 조건을 생략.",
    "주체혼동": "납세자↔과세관청, 세무서장↔지방국세청장 등 행위 주체를 바꾸는 함정.",
    "적용범위": "특정 세목에만 적용되는 규정을 다른 세목에도 적용되는 것처럼 진술하는 함정.",
    "시점변조": "신고기한, 적용시기, 시행일 등 시간 관련 정보를 바꾸는 함정.",
    "예외무시": "원칙만 진술하고 예외를 무시하거나, 예외를 원칙처럼 진술하는 함정.",
    "유사개념": "비슷하지만 다른 법률 개념을 혼동하게 만드는 함정. 과세표준↔세액, 결정↔경정 등.",
    "복합왜곡": "두 가지 이상의 함정 유형이 결합된 복합 왜곡.",
  };

  const result = Array.from(trapMap.values())
    .map((t) => ({
      name: t.name,
      description: descriptions[t.name] || `${t.name} 유형의 함정 패턴`,
      count: t.count,
      top_laws: Object.entries(t.laws)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([law, count]) => ({ law, count })),
      examples: t.examples.slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count);

  return result;
}

// ============================
// 4. 조문 암기 카드 (Law Flashcards)
// ============================
function generateLawFlashcards(questions: Question[]) {
  // Extract unique law_ref from all choices
  const lawRefMap = new Map<string, {
    law_ref: string;
    law: string;
    topics: Set<string>;
    question_nos: Set<number>;
    ox_items: { text: string; answer: string; source_no: number }[];
  }>();

  for (const q of questions) {
    for (const c of q.analysis.choices_analysis) {
      if (!c.law_ref || c.law_ref.length < 3) continue;
      const ref = c.law_ref.trim();
      if (!lawRefMap.has(ref)) {
        lawRefMap.set(ref, {
          law_ref: ref,
          law: q.대분류,
          topics: new Set(),
          question_nos: new Set(),
          ox_items: [],
        });
      }
      const entry = lawRefMap.get(ref)!;
      entry.topics.add(q.중분류);
      entry.question_nos.add(q.no);
    }

    // OX items for flashcards
    if (q.analysis.ox_items) {
      for (const ox of q.analysis.ox_items) {
        if (!ox.law_ref || ox.law_ref.length < 3) continue;
        const ref = ox.law_ref.trim();
        if (!lawRefMap.has(ref)) {
          lawRefMap.set(ref, {
            law_ref: ref,
            law: q.대분류,
            topics: new Set(),
            question_nos: new Set(),
            ox_items: [],
          });
        }
        const entry = lawRefMap.get(ref)!;
        entry.question_nos.add(q.no);
        if (entry.ox_items.length < 5) {
          entry.ox_items.push({
            text: ox.ox_text,
            answer: ox.answer,
            source_no: q.no,
          });
        }
      }
    }
  }

  const result = Array.from(lawRefMap.values())
    .filter((e) => e.ox_items.length > 0)
    .map((e) => ({
      law_ref: e.law_ref,
      law: e.law,
      topics: [...e.topics],
      question_count: e.question_nos.size,
      flashcards: e.ox_items,
    }))
    .sort((a, b) => b.question_count - a.question_count);

  return result;
}

// ============================
// Main
// ============================
function main() {
  console.log("Loading questions...");
  const questions = loadAllQuestions();
  console.log(`Loaded ${questions.length} questions`);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // 1. Exam Patterns
  console.log("\n[1/4] 출제자의 눈...");
  const patterns = generateExamPatterns(questions);
  fs.writeFileSync(
    path.join(OUT_DIR, "exam_patterns.json"),
    JSON.stringify(patterns, null, 2),
    "utf-8"
  );
  console.log(`  → ${patterns.length} topics`);

  // 2. Similar Questions
  console.log("[2/4] 유사 문항 비교...");
  const similar = generateSimilarQuestions(questions);
  fs.writeFileSync(
    path.join(OUT_DIR, "similar_questions.json"),
    JSON.stringify(similar, null, 2),
    "utf-8"
  );
  console.log(`  → ${similar.length} groups`);

  // 3. Trap Patterns
  console.log("[3/4] 함정 패턴 훈련소...");
  const traps = generateTrapPatterns(questions);
  fs.writeFileSync(
    path.join(OUT_DIR, "trap_patterns.json"),
    JSON.stringify(traps, null, 2),
    "utf-8"
  );
  console.log(`  → ${traps.length} trap types`);

  // 4. Law Flashcards
  console.log("[4/4] 조문 암기 카드...");
  const flashcards = generateLawFlashcards(questions);
  fs.writeFileSync(
    path.join(OUT_DIR, "law_flashcards.json"),
    JSON.stringify(flashcards, null, 2),
    "utf-8"
  );
  console.log(`  → ${flashcards.length} law references`);

  console.log("\nDone! Files saved to public/data/ai/");
}

main();
