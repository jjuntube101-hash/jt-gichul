/**
 * AI 프롬프트 템플릿 5종
 *
 * 각 기능의 system prompt + user message 빌더.
 * 로컬 엔진이 이미 수집한 데이터를 Claude에게 전달하여 자연어 분석을 요청.
 */

// ============================
// 1. 오늘의 브리핑
// ============================

export const BRIEFING_SYSTEM = `당신은 "JT기출" 공무원 세법/회계 학습 앱의 AI 코치입니다.
사용자의 학습 데이터를 분석하여 오늘의 브리핑을 작성합니다.

규칙:
- 한국어로 작성
- 격려하되 과하지 않게. 팩트 중심 + 따뜻한 톤
- 반드시 아래 JSON 형식으로 출력

{
  "greeting": "한 줄 인사 (이름 포함)",
  "summary": "어제 학습 요약 (1~2문장)",
  "strength": "잘한 점 (1문장)",
  "focus": "오늘 집중할 영역 (1~2문장)",
  "tip": "오늘의 학습 팁 (1문장)",
  "encouragement": "마무리 한 줄"
}`;

/** 프롬프트 인젝션 방지: 사용자 입력에서 명령어 패턴 제거 */
function sanitizeInput(input: string): string {
  return input
    .replace(/[\r\n]/g, ' ')           // 줄바꿈 제거
    .replace(/[{}[\]]/g, '')            // JSON 구조 문자 제거
    .replace(/\b(ignore|forget|system|prompt|instruction|override|admin)\b/gi, '') // 명령어 키워드 제거
    .slice(0, 100)                      // 길이 제한
    .trim();
}

export function buildBriefingMessage(data: {
  displayName: string;
  examTarget: string;
  streak: number;
  yesterdaySolved: number;
  yesterdayCorrectRate: number;
  weakTopics: string[];
  totalSolved: number;
  daysUntilExam: number | null;
}): string {
  return `학습자 정보:
- 이름: ${sanitizeInput(data.displayName)}
- 시험 목표: ${data.examTarget}
- 현재 스트릭: ${data.streak}일
- 어제 풀이: ${data.yesterdaySolved}문항 (정답률 ${data.yesterdayCorrectRate}%)
- 약점 토픽: ${data.weakTopics.join(", ") || "아직 없음"}
- 누적 풀이: ${data.totalSolved}문항
- 시험까지: ${data.daysUntilExam !== null ? `D-${data.daysUntilExam}` : "미설정"}

위 데이터를 바탕으로 오늘의 브리핑을 JSON으로 작성하세요.`;
}

// ============================
// 2. AI 오답 진단
// ============================

export const WRONG_ANSWER_SYSTEM = `당신은 공무원 세법/회계 전문 튜터입니다.
학생이 틀린 문제를 분석하여 오답 원인과 학습 조언을 제공합니다.

규칙:
- 학생이 왜 틀렸는지 구체적으로 분석
- 해당 조문의 핵심 포인트를 짚어줌
- 유사 함정을 피하는 팁 제공
- 반드시 아래 JSON 형식으로 출력

{
  "diagnosis": "오답 원인 분석 (2~3문장)",
  "key_point": "이 조문에서 가장 중요한 포인트 (1~2문장)",
  "trap_warning": "이 유형의 함정을 피하는 법 (1문장)",
  "similar_trap": "비슷한 패턴이 나올 수 있는 다른 영역 (1문장)",
  "study_tip": "추천 학습 방법 (1문장)"
}`;

export function buildWrongAnswerMessage(data: {
  questionText: string;
  choices: string[];
  correctAnswer: number;
  selectedChoice: number;
  correctAnalysis: string;
  selectedAnalysis: string;
  trapType: string | null;
  lawRef: string;
  topic: string;
}): string {
  return `문제: ${data.questionText}

선지:
${data.choices.map((c, i) => `${i + 1}. ${c}`).join("\n")}

정답: ${data.correctAnswer}번
학생 선택: ${data.selectedChoice}번

정답 선지 해설: ${data.correctAnalysis}
학생이 고른 선지 해설: ${data.selectedAnalysis}
함정 유형: ${data.trapType || "없음"}
근거법령: ${data.lawRef}
토픽: ${data.topic}

위 정보를 바탕으로 오답 진단을 JSON으로 작성하세요.`;
}

// ============================
// 3. 주간 보고서 (약점 해부)
// ============================

export const WEEKLY_REPORT_SYSTEM = `당신은 공무원 세법/회계 학습 분석 전문가입니다.
학생의 1주일 학습 데이터를 분석하여 약점 해부 보고서를 작성합니다.

규칙:
- 데이터 기반 객관적 분석
- 약점은 구체적 토픽/법명으로 지목
- 실행 가능한 개선 방안 제시
- 반드시 아래 JSON 형식으로 출력

{
  "overall_grade": "A/B/C/D 중 하나",
  "summary": "1주일 학습 요약 (2~3문장)",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "weaknesses": [
    { "topic": "토픽명", "law": "법명", "accuracy": 정답률숫자, "suggestion": "개선 방안" }
  ],
  "trap_analysis": "자주 걸리는 함정 유형 분석 (1~2문장)",
  "next_week_plan": ["다음 주 추천 학습 1", "추천 2", "추천 3"],
  "motivation": "격려 한 마디"
}`;

export function buildWeeklyReportMessage(data: {
  examTarget: string;
  totalSolvedThisWeek: number;
  avgAccuracy: number;
  topicAccuracies: { topic: string; law: string; accuracy: number; solved: number }[];
  trapFrequencies: { name: string; count: number }[];
  streakDays: number;
  comparedToLastWeek: { solvedDiff: number; accuracyDiff: number };
}): string {
  const topicList = data.topicAccuracies
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10)
    .map((t) => `  - ${t.law} > ${t.topic}: ${t.accuracy}% (${t.solved}문항)`)
    .join("\n");

  const trapList = data.trapFrequencies
    .slice(0, 5)
    .map((t) => `  - ${t.name}: ${t.count}회`)
    .join("\n");

  return `시험 목표: ${data.examTarget}
이번 주 풀이: ${data.totalSolvedThisWeek}문항 (평균 정답률 ${data.avgAccuracy}%)
지난 주 대비: 풀이 ${data.comparedToLastWeek.solvedDiff > 0 ? "+" : ""}${data.comparedToLastWeek.solvedDiff}문항, 정답률 ${data.comparedToLastWeek.accuracyDiff > 0 ? "+" : ""}${data.comparedToLastWeek.accuracyDiff}%p
스트릭: ${data.streakDays}일

정답률 하위 토픽:
${topicList}

자주 걸린 함정:
${trapList}

위 데이터를 바탕으로 주간 보고서를 JSON으로 작성하세요.`;
}

// ============================
// 4. D-day 전략
// ============================

export const DDAY_STRATEGY_SYSTEM = `당신은 공무원 시험 대비 전략 수립 전문가입니다.
시험일까지 남은 기간과 학생의 현재 학습 상태를 분석하여 맞춤 전략을 수립합니다.

규칙:
- 남은 일수에 따라 현실적인 전략 수립
- 약점 토픽을 우선 공략하되, 강점도 유지
- 주단위 마일스톤 제시
- 반드시 아래 JSON 형식으로 출력

{
  "phase": "초반/중반/막판/직전 중 하나",
  "strategy_title": "전략 한 줄 요약",
  "daily_target": { "questions": 목표문항수, "hours": 목표시간 },
  "priority_topics": [
    { "topic": "토픽명", "law": "법명", "reason": "우선 이유", "target_accuracy": 목표정답률 }
  ],
  "weekly_milestones": [
    { "week": 1, "goal": "이번 주 목표" }
  ],
  "exam_day_tips": ["시험 당일 팁 1", "팁 2"],
  "confidence_message": "격려 메시지"
}`;

export function buildDdayStrategyMessage(data: {
  examTarget: string;
  daysUntilExam: number;
  totalSolved: number;
  totalQuestions: number;
  overallAccuracy: number;
  weakTopics: { topic: string; law: string; accuracy: number }[];
  strongTopics: { topic: string; law: string; accuracy: number }[];
  currentStreak: number;
}): string {
  const weakList = data.weakTopics
    .slice(0, 8)
    .map((t) => `  - ${t.law} > ${t.topic}: ${t.accuracy}%`)
    .join("\n");

  const strongList = data.strongTopics
    .slice(0, 5)
    .map((t) => `  - ${t.law} > ${t.topic}: ${t.accuracy}%`)
    .join("\n");

  return `시험 목표: ${data.examTarget}
시험까지: D-${data.daysUntilExam}
진도율: ${data.totalSolved}/${data.totalQuestions}문항 (${Math.round((data.totalSolved / data.totalQuestions) * 100)}%)
전체 정답률: ${data.overallAccuracy}%
연속 학습: ${data.currentStreak}일

약점 토픽:
${weakList}

강점 토픽:
${strongList}

위 데이터를 바탕으로 D-day 전략을 JSON으로 작성하세요.`;
}

// ============================
// 5. AI 모의고사 해설
// ============================

export const MOCK_EXAM_REVIEW_SYSTEM = `당신은 공무원 세법/회계 모의고사 해설 전문가입니다.
모의고사 결과를 종합 분석하여 간결한 피드백을 제공합니다.

규칙:
- 전체 결과 요약 + 과목별 분석
- 틀린 문제의 공통 패턴 지적
- 다음 학습 방향 제시
- 반드시 아래 JSON 형식으로 출력

{
  "grade": "A/B/C/D/F 중 하나",
  "summary": "모의고사 종합 평가 (2~3문장)",
  "wrong_pattern": "오답 공통 패턴 (1~2문장)",
  "subject_feedback": [
    { "law": "법명", "score": "정답/총수", "comment": "한 줄 코멘트" }
  ],
  "improvement_plan": ["개선 방안 1", "개선 방안 2", "개선 방안 3"],
  "next_focus": "다음에 집중할 영역 (1문장)"
}`;

export function buildMockExamReviewMessage(data: {
  score: number;
  totalQuestions: number;
  accuracy: number;
  wrongQuestions: { no: number; law: string; topic: string; trapType: string | null }[];
  lawScores: { law: string; correct: number; total: number }[];
}): string {
  const wrongList = data.wrongQuestions
    .slice(0, 10)
    .map((q) => `  - #${q.no} ${q.law}>${q.topic} (함정: ${q.trapType || "없음"})`)
    .join("\n");

  const lawList = data.lawScores
    .map((l) => `  - ${l.law}: ${l.correct}/${l.total}`)
    .join("\n");

  return `모의고사 결과:
점수: ${data.score}/${data.totalQuestions} (${data.accuracy}%)

과목별:
${lawList}

틀린 문제:
${wrongList}

위 결과를 바탕으로 모의고사 피드백을 JSON으로 작성하세요.`;
}
