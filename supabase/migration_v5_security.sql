-- ============================================
-- Migration v5: 보안 강화
-- 날짜: 2026-04-07
-- ============================================

-- 1. ai_usage 테이블: 사용자 UPDATE 정책 제거 (레이트리밋 우회 방지)
-- 사용자가 직접 count를 0으로 리셋하면 무제한 API 사용이 가능했음
DROP POLICY IF EXISTS "Users can update own AI usage" ON ai_usage;

-- service_role만 UPDATE 가능하도록 (기본 동작: RLS가 적용된 상태에서 policy 없으면 차단)
-- INSERT는 service_role만 사용하므로 사용자 INSERT 정책도 제거
DROP POLICY IF EXISTS "Users can insert own AI usage" ON ai_usage;

-- 읽기만 허용 (사용자가 자신의 사용량 확인용)
-- 기존 SELECT 정책은 유지

-- 2. ai_cache 테이블: 인증 사용자 전체 읽기 → service_role만
-- 다른 사용자의 AI 분석 결과가 노출되는 것 방지
DROP POLICY IF EXISTS "Authenticated users can read AI cache" ON ai_cache;

-- service_role만 접근하므로 별도 정책 불필요 (service_role은 RLS 우회)

-- 3. 확인용 쿼리 (실행 후 정책 목록 확인)
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('ai_usage', 'ai_cache')
-- ORDER BY tablename, policyname;
