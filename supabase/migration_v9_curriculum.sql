-- ============================================================================
-- Migration V9: 커리큘럼 설정 + 합격 예측 자기평가
-- ============================================================================

-- 1. user_study_profiles에 커리큘럼 설정 JSONB 컬럼 추가
-- 구조: { "tax": { "presetId": "default_tax_9", "customWeeks": null }, ... }
ALTER TABLE user_study_profiles
  ADD COLUMN IF NOT EXISTS curriculum_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN user_study_profiles.curriculum_settings IS
  '과목별 커리큘럼 프리셋 선택. { subject: { presetId, customWeeks } }';

-- 2. user_study_profiles에 자기평가 점수 JSONB 컬럼 추가
-- 구조: { "korean": 70, "english": 65, "constitution": 55 }
ALTER TABLE user_study_profiles
  ADD COLUMN IF NOT EXISTS self_assessed_scores JSONB DEFAULT NULL;

COMMENT ON COLUMN user_study_profiles.self_assessed_scores IS
  '기출 데이터 없는 과목의 자기평가 예상 점수 (0-100)';

-- 3. 공지사항 시드 데이터 (class 대시보드용)
INSERT INTO announcements (title, content, author_id, pinned, created_at)
SELECT '강의실 오픈 안내',
       '합격 코치 시스템이 오픈되었습니다! 월간/주간/일일 학습 플랜을 확인해보세요.',
       (SELECT id FROM auth.users LIMIT 1),
       true,
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = '강의실 오픈 안내');
