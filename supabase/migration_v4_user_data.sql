-- Migration v4: 유저 데이터 확장 (Sprint 19)
-- 실행: Supabase Dashboard > SQL Editor

-- 1. 학습 프로필 (온보딩에서 수집)
CREATE TABLE IF NOT EXISTS user_study_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  exam_target TEXT CHECK (exam_target IN ('9급', '7급')),
  exam_name TEXT,
  exam_date DATE,
  daily_study_goal_minutes INTEGER DEFAULT 30,
  weak_subjects TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_study_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own study profile"
  ON user_study_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study profile"
  ON user_study_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study profile"
  ON user_study_profiles FOR UPDATE USING (auth.uid() = user_id);

-- 2. 일일 학습 로그 (localStorage 통합)
CREATE TABLE IF NOT EXISTS daily_study_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  study_seconds INTEGER DEFAULT 0,
  pomodoro_sessions INTEGER DEFAULT 0,
  solve_count INTEGER DEFAULT 0,
  ox_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  plan_steps_completed SMALLINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_study_logs(user_id, log_date DESC);

ALTER TABLE daily_study_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own daily logs"
  ON daily_study_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily logs"
  ON daily_study_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily logs"
  ON daily_study_logs FOR UPDATE USING (auth.uid() = user_id);

-- 3. 간격 복습 카드 (localStorage → DB)
CREATE TABLE IF NOT EXISTS spaced_repetition_cards (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_no INTEGER NOT NULL,
  next_review_date DATE NOT NULL,
  interval_days INTEGER DEFAULT 1,
  ease_factor NUMERIC(3,2) DEFAULT 2.50,
  repetition_count INTEGER DEFAULT 0,
  last_review_date DATE,
  PRIMARY KEY(user_id, question_no)
);

CREATE INDEX IF NOT EXISTS idx_sr_user_review ON spaced_repetition_cards(user_id, next_review_date);

ALTER TABLE spaced_repetition_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own SR cards"
  ON spaced_repetition_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own SR cards"
  ON spaced_repetition_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SR cards"
  ON spaced_repetition_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own SR cards"
  ON spaced_repetition_cards FOR DELETE USING (auth.uid() = user_id);

-- 4. AI 캐시 (공유 — 같은 문제+선지 = 같은 응답)
CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0
);

-- AI 캐시는 서비스 키로만 접근 (API 라우트에서)
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI cache is read-only for authenticated"
  ON ai_cache FOR SELECT USING (auth.role() = 'authenticated');

-- 5. AI 사용량 추적
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  use_date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY(user_id, feature, use_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own AI usage"
  ON ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI usage"
  ON ai_usage FOR UPDATE USING (auth.uid() = user_id);

-- 확인 쿼리
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_study_profiles', 'daily_study_logs', 'spaced_repetition_cards', 'ai_cache', 'ai_usage')
ORDER BY table_name;
