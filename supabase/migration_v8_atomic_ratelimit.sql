-- v8: AI 사용량 원자적 증가 함수
-- TOCTOU 취약점 방지: SELECT→UPDATE 분리 대신 단일 함수로 원자적 처리

CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_use_date DATE,
  p_limit INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- INSERT or UPDATE atomically
  INSERT INTO ai_usage (user_id, feature, use_date, count)
  VALUES (p_user_id, p_feature, p_use_date, 1)
  ON CONFLICT (user_id, feature, use_date)
  DO UPDATE SET count = ai_usage.count + 1
  RETURNING count INTO v_count;

  -- 제한 초과 시 롤백하고 -1 반환
  IF v_count > p_limit THEN
    UPDATE ai_usage
    SET count = count - 1
    WHERE user_id = p_user_id AND feature = p_feature AND use_date = p_use_date;
    RETURN -1;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION increment_ai_usage IS 'AI 사용량 원자적 증가. 제한 초과 시 -1 반환, 성공 시 현재 count 반환.';
