# Unleash (OSS) 연동 가이드 — headless

이 플랫폼은 **오픈소스 Unleash**(github.com/Unleash/unleash)를 **1차 타겟**으로 사용합니다.
운영자는 **Unleash 콘솔을 직접 쓰지 않고**, 이 플랫폼의 **Feature Flags 화면(`/flags`)** 에서만 flag를 제어합니다(headless).
백엔드(`server/`)만 Unleash **Admin API**를 호출하고, 차량/프런트는 Unleash를 직접 호출하지 않습니다.

> 키/토큰은 **서버 env 전용**(레포·채팅 금지). 공개 GitHub Pages 데모는 항상 **Mock 모드**로 동작합니다.

## 1) OSS Unleash 자체 호스팅 (Docker)
```bash
cd server
docker compose -f docker-compose.unleash.yml up -d     # unleash(4242) + postgres
bash unleash-init.sh                                    # dev/qa/prod 환경 생성·활성화
```
- 콘솔(선택 확인용): http://localhost:4242 — 데모 부트스트랩 Admin 토큰 `*:*.unleash-insecure-admin-api-token`
- Segments(Pro 전용)는 사용하지 않습니다 — 적용범위는 **constraints 인라인**으로 매핑(`ruleToUnleash`).

## 2) 백엔드 연결
`server/.env` (← `.env.example` 복사):
```
UNLEASH_URL=http://localhost:4242
UNLEASH_ADMIN_TOKEN=*:*.unleash-insecure-admin-api-token
UNLEASH_PROJECT=default
# 환경명이 dev/qa/prod 와 다르면: UNLEASH_ENV_MAP=dev:development,prod:production
```
```bash
cd server && npm install && npm run start    # /api/flags/* 활성화 (미설정 시 503 → 프런트 Mock)
```

## 3) 프런트 연결
`feature-platform-ui/.env.local`:
```
VITE_API_URL=http://localhost:9100
```
`npm run dev`(9001) → **Feature Flags** 화면 배지가 **"Unleash 연결됨"** 으로 전환.

## 동작 요약
- 적용범위 룰(EligibilityRule) → `ruleToUnleash()` → flexibleRollout(% , stickiness=vin) + constraints(region/trim/hw/sw/option…).
- **RG3(Policy) PASS** 후에만 prod 동기화 허용, Release GO 시 prod enable, Kill 스위치는 prod off.
- 모든 flag 변경은 플랫폼 `auditLog`에 기록(진실원천=플랫폼). Unleash 직접 변경은 운영 원칙상 금지.

## 운영 전환(유료/Enterprise)
동일 어댑터로 `UNLEASH_URL`/`UNLEASH_ADMIN_TOKEN`만 교체하면 됩니다(Enterprise는 Segments·환경 무제한 등 추가 기능 사용 가능). OSS로 1차 검증 후 필요 시 전환하세요.
