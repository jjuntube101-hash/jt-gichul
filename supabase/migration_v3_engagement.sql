-- JT기출 v3 마이그레이션: 스트릭 프리즈 + 참여 기능
-- 실행: Supabase Dashboard > SQL Editor
-- Sprint 15: Sticky App 핵심 참여 루프

-- 1. user_profiles에 스트릭 프리즈 컬럼 추가
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS streak_freezes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_freeze_earned_at DATE,
  ADD COLUMN IF NOT EXISTS last_freeze_used_at DATE;

-- 2. (향후 Sprint 16+) 데일리 퀘스트 서버 저장용 테이블
-- 현재는 localStorage 기반, 서버 동기화 시 활성화
-- CREATE TABLE IF NOT EXISTS daily_quests (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
--   quest_date DATE NOT NULL,
--   quest_slot SMALLINT NOT NULL CHECK (quest_slot BETWEEN 1 AND 3),
--   quest_type TEXT NOT NULL,
--   target_value INTEGER NOT NULL,
--   current_value INTEGER DEFAULT 0,
--   completed_at TIMESTAMPTZ,
--   UNIQUE(user_id, quest_date, quest_slot)
-- );

-- 3. (향후 Sprint 16+) 일일 통계 집계 테이블
-- CREATE TABLE IF NOT EXISTS daily_stats (
--   stat_date DATE PRIMARY KEY,
--   total_users INTEGER DEFAULT 0,
--   total_solves INTEGER DEFAULT 0,
--   percentile_thresholds JSONB DEFAULT '{}'
-- );
