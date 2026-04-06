<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 피드백 시스템

### 세션 시작 워크플로우
1. `PROGRESS.md` 읽기 (기존)
2. `bash scripts/feedback-cli.sh list` 실행 → 미처리 피드백 확인
3. 피드백이 있으면 사용자에게 요약 보고 후 처리 여부 확인

### 피드백 처리 판단 기준
- **즉시 수정**: 버그(bug), 명백한 UI 깨짐
- **사용자 확인 후 수정**: 기능 요청(feature), UX 변경 제안
- **미반영(wontfix)**: 의도된 동작, 범위 밖 요청

### CLI 명령어
```bash
bash scripts/feedback-cli.sh list              # 미처리 목록
bash scripts/feedback-cli.sh all               # 전체 목록
bash scripts/feedback-cli.sh resolve <id> "메모" # 해결 처리
bash scripts/feedback-cli.sh wontfix <id> "사유" # 미반영 처리
```

### 설정
- `.env.feedback` 파일에 `SUPABASE_URL`과 `SUPABASE_SERVICE_KEY` 필요
- Service Role Key는 Supabase Dashboard > Settings > API에서 확인
