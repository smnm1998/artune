#!/bin/bash
# artune 응답시간 실측: 3개 감정 × 순차(SSE)/병렬(POST) = 6요청, 간격 60s
BASE="http://localhost:${PORT:-3100}"

# 글로벌 프리픽스 /api — 404도 "서버 살아있음"으로 간주
alive() {
  local code
  code=$(curl -s -o /dev/null -m 2 -w "%{http_code}" "$BASE/api" 2>/dev/null)
  [ "$code" != "000" ] && [ -n "$code" ]
}

echo "[measure] 서버 대기 중... ($BASE)"
for i in $(seq 1 60); do
  alive && break
  sleep 2
done
if ! alive; then
  echo "[measure] FAIL: 서버가 120초 내에 뜨지 않음"
  exit 1
fi
echo "[measure] 서버 확인, 측정 시작"

texts=("오늘 정말 행복한 하루였어!" "요즘 너무 외롭고 쓸쓸한 기분이야" "시험 결과가 불안해서 잠이 안 와")

run_sse() {
  echo "[$(date +%T)] SSE  시작: $1"
  curl -sN -G --data-urlencode "text=$1" -o /dev/null \
    -w "[client] sse  total=%{time_total}s\n" \
    -m 120 "$BASE/api/emotion/analyze-stream"
}

run_post() {
  echo "[$(date +%T)] POST 시작: $1"
  curl -s -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"$1\"}" -o /dev/null \
    -w "[client] post total=%{time_total}s\n" \
    -m 120 "$BASE/api/emotion/analyze"
}

for i in 0 1 2; do
  t="${texts[$i]}"
  # 캐시 편향 상쇄: 쌍 내 실행 순서를 교대
  if [ $((i % 2)) -eq 0 ]; then
    run_sse "$t";  sleep 60
    run_post "$t"
  else
    run_post "$t"; sleep 60
    run_sse "$t"
  fi
  [ $i -lt 2 ] && sleep 60
done

echo "[measure] DONE"
