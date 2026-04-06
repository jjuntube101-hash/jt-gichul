-- JT기출 피드백 시스템 마이그레이션
-- 실행: Supabase Dashboard > SQL Editor에서 실행

-- 피드백 테이블
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'ui', 'other')),
  content TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  screen_size TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wontfix')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

-- RLS: 누구나 INSERT 가능, 읽기/수정은 service_role만 (관리자용)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 비로그인 사용자도 피드백 제출 가능
CREATE POLICY "Anyone can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (true);

-- 로그인 사용자는 본인 피드백만 조회 가능
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);
