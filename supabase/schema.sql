-- JT기출 Supabase 스키마
-- 실행: Supabase Dashboard > SQL Editor에서 실행

-- 1. 사용자 프로필
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_exam TEXT CHECK (target_exam IN ('9급', '7급')),
  streak_days INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 문항 풀이 기록
CREATE TABLE IF NOT EXISTS solve_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_no INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  selected_choice INTEGER NOT NULL,
  time_spent_ms INTEGER DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'ox', 'timer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. OX 풀이 기록
CREATE TABLE IF NOT EXISTS ox_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_no INTEGER NOT NULL,
  ox_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_solve_user ON solve_records(user_id);
CREATE INDEX IF NOT EXISTS idx_solve_question ON solve_records(question_no);
CREATE INDEX IF NOT EXISTS idx_solve_user_question ON solve_records(user_id, question_no);
CREATE INDEX IF NOT EXISTS idx_ox_user ON ox_records(user_id);

-- RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solve_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ox_records ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 데이터만 접근
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own solve records"
  ON solve_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own solve records"
  ON solve_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ox records"
  ON ox_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ox records"
  ON ox_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
