"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getSupabase } from "@/lib/supabase";
import { loadAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";

export interface TopicMastery {
  law: string;
  topic: string;
  total: number;
  correct: number;
  accuracy: number; // 0~100
  level: "none" | "red" | "yellow" | "green" | "gold";
}

export interface LawMastery {
  law: string;
  topics: TopicMastery[];
  totalSolved: number;
  totalAvailable: number;
  avgAccuracy: number;
}

// ---------------------------------------------------------------------------
// 기본서(구조노트) 목차 순서
// ---------------------------------------------------------------------------

/** 법률 카테고리 */
export type LawCategory = "국세" | "지방세" | "회계";

/** 법률별 카테고리 매핑 */
const LAW_CATEGORY: Record<string, LawCategory> = {
  // 국세
  "조세법 총론": "국세",
  "국세기본법": "국세",
  "소득세법": "국세",
  "법인세법": "국세",
  "부가가치세법": "국세",
  "상속세 및 증여세법": "국세",
  "국세징수법": "국세",
  "종합부동산세법": "국세",
  // 지방세
  "지방세기본법": "지방세",
  "지방세법": "지방세",
  "지방세징수법": "지방세",
  "지방세특례제한법": "지방세",
  // 회계
  "회계원리": "회계",
  "재무회계-자산": "회계",
  "재무회계-부채자본재무보고": "회계",
  "원가관리회계": "회계",
  "정부회계": "회계",
};

/** 기본서 목차 순서 — 총론 맨 앞, 국세 → 지방세 → 회계 */
const LAW_ORDER: string[] = [
  // 국세 (총론 → 기본법 → 실체법 → 절차법)
  "조세법 총론",
  "국세기본법",
  "소득세법",
  "법인세법",
  "부가가치세법",
  "상속세 및 증여세법",
  "국세징수법",
  "종합부동산세법",
  // 지방세
  "지방세기본법",
  "지방세법",
  "지방세징수법",
  "지방세특례제한법",
  // 회계
  "회계원리",
  "재무회계-자산",
  "재무회계-부채자본재무보고",
  "원가관리회계",
  "정부회계",
];

/** 법률 내 토픽(중분류) 기본서 목차 순서 */
const TOPIC_ORDER: Record<string, string[]> = {
  "조세법 총론": ["조세법의 체계"],
  "국세기본법": [
    "총칙", "과세", "납세의무", "납세의무의 확장",
    "국세와 일반채권의 관계", "국세 부과와 세법 적용",
    "국세환급금과 국세환급가산금", "납세자의 권리",
    "심사와 심판", "보칙",
  ],
  "소득세법": [
    "총칙", "금융소득", "사업소득", "근로소득",
    "연금소득 및 기타소득", "종합소득세의 계산",
    "소득금액 계산의 특례", "퇴직소득세", "양도소득세", "납세절차",
  ],
  "법인세법": [
    "총칙", "법인세의 계산구조", "익금과 익금불산입",
    "손금과 손금불산입", "손익의 귀속시기",
    "자산의 취득가액 및 자산·부채의 평가", "감가상각비",
    "지급이자 손금불산입", "기업업무추진비와 기부금",
    "충당금과 준비금", "과세표준의 계산",
    "산출세액 및 차감납부세액의 계산", "부당행위계산의 부인",
    "의제배당", "합병 및 분할 등에 관한 특례",
    "연결납세제도", "기타 법인세", "법인세 납세절차",
  ],
  "부가가치세법": [
    "총칙", "과세거래", "공급시기 및 공급장소",
    "영세율과 면세", "과세표준과 세액의 계산",
    "겸영사업자의 안분 계산", "신고와 납부 등",
    "결정·경정·징수와 환급", "간이과세",
  ],
  "상속세 및 증여세법": [
    "상속세", "증여세", "재산의 평가", "납세절차",
  ],
  "국세징수법": [
    "총칙", "납부고지 등", "강제징수", "보칙", "관련 법령 폐지",
  ],
  "종합부동산세법": ["종부세"],
  "지방세기본법": [
    "총칙", "납세의무", "신고", "부과징수",
    "가산세", "환급", "납세담보", "납세자권리",
    "불복", "범칙",
  ],
  "지방세법": [
    "총칙", "취득세", "등록면허세", "레저세",
    "담배소비세", "지방소비세", "주민세",
    "지방소득세", "재산세", "자동차세",
    "지역자원시설세", "지방교육세",
  ],
  "지방세징수법": ["징수", "체납처분"],
  "지방세특례제한법": ["총칙보칙", "감면"],
  "회계원리": ["회계의기초", "개념체계", "복식부기", "회계순환과정"],
  "재무회계-자산": [
    "현금및현금성자산", "수취채권", "재고자산",
    "유형자산", "무형자산", "투자부동산", "금융자산",
  ],
  "재무회계-부채자본재무보고": [
    "유동부채", "사채", "충당부채·우발부채", "리스",
    "자본", "수익인식", "현금흐름표",
    "회계변경과오류수정", "재무제표분석",
    "주당이익", "법인세회계·특수",
  ],
  "원가관리회계": [
    "원가회계총론", "개별원가계산", "종합원가계산",
    "결합원가", "원가배분", "ABC",
    "전부vs변동원가", "표준원가", "CVP분석", "의사결정",
  ],
  "정부회계": ["총론", "국가재무제표", "지방재무제표", "종합비교"],
};

export function getLawCategory(law: string): LawCategory {
  return LAW_CATEGORY[law] ?? "국세";
}

function getLawSortIndex(law: string): number {
  const idx = LAW_ORDER.indexOf(law);
  return idx >= 0 ? idx : LAW_ORDER.length;
}

function getTopicSortIndex(law: string, topic: string): number {
  const order = TOPIC_ORDER[law];
  if (!order) return 999;
  const idx = order.indexOf(topic);
  return idx >= 0 ? idx : order.length;
}

function getLevel(accuracy: number, total: number): TopicMastery["level"] {
  if (total === 0) return "none";
  if (accuracy < 50) return "red";
  if (accuracy < 70) return "yellow";
  if (accuracy < 90) return "green";
  return "gold";
}

export function useTopicMastery() {
  const { user } = useAuth();
  const [data, setData] = useState<LawMastery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const supabase = getSupabase();
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data: records } = await supabase
          .from("solve_records")
          .select("question_no, is_correct")
          .eq("user_id", user.id);

        const allQ = await loadAllQuestions();

        // 전체 토픽 구조 구축
        const topicAvailable = new Map<string, number>();
        for (const q of allQ) {
          const key = `${q.대분류}|${q.중분류}`;
          topicAvailable.set(key, (topicAvailable.get(key) ?? 0) + 1);
        }

        // 풀이 기록 집계
        const qMap = new Map<number, Question>();
        for (const q of allQ) qMap.set(q.no, q);

        const topicStats = new Map<string, { total: number; correct: number }>();
        if (records) {
          for (const r of records) {
            const q = qMap.get(r.question_no);
            if (!q) continue;
            const key = `${q.대분류}|${q.중분류}`;
            const s = topicStats.get(key) ?? { total: 0, correct: 0 };
            s.total++;
            if (r.is_correct) s.correct++;
            topicStats.set(key, s);
          }
        }

        // LawMastery 구축
        const lawMap = new Map<string, TopicMastery[]>();
        for (const [key, available] of topicAvailable) {
          const [law, topic] = key.split("|");
          const s = topicStats.get(key) ?? { total: 0, correct: 0 };
          const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;

          if (!lawMap.has(law)) lawMap.set(law, []);
          lawMap.get(law)!.push({
            law,
            topic,
            total: s.total,
            correct: s.correct,
            accuracy,
            level: getLevel(accuracy, s.total),
          });
        }

        const result: LawMastery[] = Array.from(lawMap.entries()).map(([law, topics]) => {
          const totalSolved = topics.reduce((sum, t) => sum + t.total, 0);
          const totalCorrect = topics.reduce((sum, t) => sum + t.correct, 0);
          const totalAvailable = topics.reduce(
            (sum, t) => sum + (topicAvailable.get(`${law}|${t.topic}`) ?? 0),
            0
          );
          return {
            law,
            topics,
            totalSolved,
            totalAvailable,
            avgAccuracy: totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0,
          };
        });

        // 기본서 목차 순서로 정렬 (법률 + 토픽 모두)
        result.sort((a, b) => getLawSortIndex(a.law) - getLawSortIndex(b.law));
        for (const law of result) {
          law.topics.sort(
            (a, b) => getTopicSortIndex(law.law, a.topic) - getTopicSortIndex(law.law, b.topic)
          );
        }

        setData(result);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return { data, loading };
}
