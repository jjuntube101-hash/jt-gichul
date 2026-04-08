-- ============================================================
-- Migration v6: 강의 커뮤니티 MVP
-- 4개 테이블: enrollment_codes, enrollment_logs, question_comments, class_announcements
-- ============================================================

-- 1. 수강 코드 테이블 (1인 1코드)
CREATE TABLE IF NOT EXISTS enrollment_codes (
  code TEXT PRIMARY KEY,
  batch_name TEXT,
  expires_at TIMESTAMPTZ,
  premium_days INTEGER DEFAULT 180,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  used_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enrollment_codes ENABLE ROW LEVEL SECURITY;
-- API 라우트(service_role)로만 접근 → 클라이언트 RLS 정책 없음
CREATE INDEX IF NOT EXISTS idx_ec_used_by ON enrollment_codes(used_by);

-- 2. 수강 등록 로그
CREATE TABLE IF NOT EXISTS enrollment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT,
  source TEXT NOT NULL DEFAULT 'enrollment_code',
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enrollment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollment"
  ON enrollment_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 3. 문제별 댓글
CREATE TABLE IF NOT EXISTS question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_no INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES question_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) <= 1000),
  is_official BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qc_question ON question_comments(question_no, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_user ON question_comments(user_id);

ALTER TABLE question_comments ENABLE ROW LEVEL SECURITY;

-- premium 사용자만 읽기 (만료일 체크 포함)
CREATE POLICY "Premium users can read comments" ON question_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_premium = true
      AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
    )
  );

-- premium 사용자만 쓰기
CREATE POLICY "Premium users can insert comments" ON question_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_premium = true
      AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
    )
  );

-- 본인 댓글만 수정 (soft delete용)
CREATE POLICY "Users can update own comments" ON question_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. 강의 공지
CREATE TABLE IF NOT EXISTS class_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  link_label TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE class_announcements ENABLE ROW LEVEL SECURITY;

-- premium 사용자만 읽기 (만료일 체크 포함)
CREATE POLICY "Premium users can read announcements" ON class_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_premium = true
      AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
    )
  );

-- 5. user_profiles에 display_name 컬럼 추가 (없는 경우만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN display_name TEXT;
  END IF;
END $$;
