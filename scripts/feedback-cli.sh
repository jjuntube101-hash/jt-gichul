#!/bin/bash
# JT기출 피드백 CLI — Claude Code가 사용하는 피드백 조회/처리 도구
# 사용법:
#   ./scripts/feedback-cli.sh list          # 미처리 피드백 목록
#   ./scripts/feedback-cli.sh all           # 전체 피드백 목록
#   ./scripts/feedback-cli.sh resolve <id> "해결 메모"  # 피드백 해결 처리
#   ./scripts/feedback-cli.sh wontfix <id> "사유"       # 미반영 처리
#
# 환경변수 필요:
#   SUPABASE_URL       — Supabase 프로젝트 URL
#   SUPABASE_SERVICE_KEY — Service Role Key (anon key 아님!)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# .env.feedback에서 읽기 (보안: .gitignore에 추가됨)
if [ -f "$PROJECT_DIR/.env.feedback" ]; then
  source <(grep -v '^#' "$PROJECT_DIR/.env.feedback" | sed 's/^/export /')
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ 환경변수 누락"
  echo "   .env.feedback 파일에 다음 설정 필요:"
  echo "   SUPABASE_URL=https://xxx.supabase.co"
  echo "   SUPABASE_SERVICE_KEY=eyJ..."
  exit 1
fi

API="$SUPABASE_URL/rest/v1"
AUTH="apikey: $SUPABASE_SERVICE_KEY"
BEARER="Authorization: Bearer $SUPABASE_SERVICE_KEY"

case "$1" in
  list)
    echo "📋 미처리 피드백 (status=new)"
    echo "---"
    curl -s "$API/feedback?status=eq.new&order=created_at.desc" \
      -H "$AUTH" -H "$BEARER" \
      -H "Content-Type: application/json" | \
      python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data:
    print('  (없음)')
else:
    for f in data:
        cat_map = {'bug':'🐛 버그','feature':'💡 기능','ui':'🎨 UI','other':'💬 기타'}
        cat = cat_map.get(f['category'], f['category'])
        print(f\"  [{f['id'][:8]}] {cat} | {f['page_url'] or '/'}\")
        print(f\"    {f['content'][:100]}\")
        print(f\"    📅 {f['created_at'][:16]} | 📱 {f.get('screen_size','?')}\")
        print()
print(f'총 {len(data)}건')
" 2>/dev/null || echo "(python3 필요 — JSON 원본 출력)" && \
      curl -s "$API/feedback?status=eq.new&order=created_at.desc&select=id,category,content,page_url,created_at,screen_size" \
        -H "$AUTH" -H "$BEARER"
    ;;

  all)
    echo "📋 전체 피드백"
    echo "---"
    curl -s "$API/feedback?order=created_at.desc&limit=50" \
      -H "$AUTH" -H "$BEARER" \
      -H "Content-Type: application/json" | \
      python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data:
    print('  (없음)')
else:
    status_map = {'new':'🆕','reviewing':'🔍','resolved':'✅','wontfix':'⏭️'}
    cat_map = {'bug':'🐛','feature':'💡','ui':'🎨','other':'💬'}
    for f in data:
        s = status_map.get(f['status'], f['status'])
        c = cat_map.get(f['category'], f['category'])
        print(f\"  {s} [{f['id'][:8]}] {c} {f['content'][:80]}\")
        if f.get('resolution_note'):
            print(f\"    → {f['resolution_note'][:80]}\")
print(f'\\n총 {len(data)}건')
" 2>/dev/null
    ;;

  resolve)
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "사용법: $0 resolve <id> \"해결 메모\""
      exit 1
    fi
    echo "✅ 피드백 해결 처리: $2"
    curl -s -X PATCH "$API/feedback?id=eq.$2" \
      -H "$AUTH" -H "$BEARER" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\":\"resolved\",\"resolution_note\":\"$3\",\"resolved_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    echo "  완료"
    ;;

  wontfix)
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "사용법: $0 wontfix <id> \"사유\""
      exit 1
    fi
    echo "⏭️ 피드백 미반영 처리: $2"
    curl -s -X PATCH "$API/feedback?id=eq.$2" \
      -H "$AUTH" -H "$BEARER" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\":\"wontfix\",\"resolution_note\":\"$3\",\"resolved_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    echo "  완료"
    ;;

  *)
    echo "JT기출 피드백 CLI"
    echo ""
    echo "사용법:"
    echo "  $0 list              미처리 피드백 목록"
    echo "  $0 all               전체 피드백 목록 (최근 50건)"
    echo "  $0 resolve <id> \"메모\"  피드백 해결 처리"
    echo "  $0 wontfix <id> \"사유\"  미반영 처리"
    ;;
esac
