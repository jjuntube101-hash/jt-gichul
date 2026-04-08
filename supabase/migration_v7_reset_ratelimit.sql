-- v7: Reset API DB 기반 레이트리밋
-- user_profiles 테이블에 last_reset_at 컬럼 추가

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN user_profiles.last_reset_at IS '마지막 학습 데이터 리셋 시각 (1일 1회 제한용)';
