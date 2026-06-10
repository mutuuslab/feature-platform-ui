#!/usr/bin/env bash
# OSS Unleash 환경 부트스트랩 — dev/qa/prod 환경을 생성하고 default 프로젝트에 활성화한다.
# (Unleash OSS는 Environments 기능 지원. Segments는 Pro 전용이라 사용하지 않음 — 어댑터는 constraints 인라인.)
# 사용:  bash unleash-init.sh   (docker compose 로 unleash 기동 후)
set -euo pipefail

URL="${UNLEASH_URL:-http://localhost:4242}"
TOKEN="${UNLEASH_ADMIN_TOKEN:-*:*.unleash-insecure-admin-api-token}"
PROJECT="${UNLEASH_PROJECT:-default}"
AUTH=(-H "Authorization: ${TOKEN}" -H "Content-Type: application/json")

echo "▶ Unleash 기동 대기: ${URL}"
for i in $(seq 1 40); do
  if curl -fsS "${URL}/health" >/dev/null 2>&1; then break; fi
  sleep 2
  [ "$i" = "40" ] && { echo "✗ Unleash 응답 없음"; exit 1; }
done
echo "✓ Unleash up"

# 환경 생성(이미 있으면 무시) + default 프로젝트에 활성화
for ENV in dev qa prod; do
  TYPE="development"; [ "$ENV" = "prod" ] && TYPE="production"
  echo "▶ 환경 생성: ${ENV} (${TYPE})"
  curl -fsS "${URL}/api/admin/environments" "${AUTH[@]}" \
    -X POST -d "{\"name\":\"${ENV}\",\"type\":\"${TYPE}\",\"enabled\":true}" >/dev/null 2>&1 || true
  echo "▶ 프로젝트(${PROJECT})에 ${ENV} 활성화"
  curl -fsS "${URL}/api/admin/projects/${PROJECT}/environments" "${AUTH[@]}" \
    -X POST -d "{\"environment\":\"${ENV}\"}" >/dev/null 2>&1 || true
done

echo ""
echo "✅ 완료. server/.env 에 아래를 설정하고 백엔드를 재시작하세요:"
echo "   UNLEASH_URL=${URL}"
echo "   UNLEASH_ADMIN_TOKEN=${TOKEN}"
echo "   UNLEASH_PROJECT=${PROJECT}"
echo "   (환경명이 dev/qa/prod 와 다르면 UNLEASH_ENV_MAP 로 매핑)"
