# Feature Platform — Lifecycle Governance (Mock-UI)

자동차 OEM **Feature Lifecycle 거버넌스 플랫폼**의 데모/PoC 프론트엔드. 엑셀 설계서
`Feature_Platform_E2E_Workflow_Role_Based_REV5.xlsx`(66 시트)를 기반으로 구현.

> **방향 안 A — Refine + Ant Design (메타프레임워크 가속형)**. 백엔드 없이 인메모리 Mock 데이터로
> 모든 화면이 동작하며, 실서버 연동 시 `src/data/dataProvider.ts`만 교체하면 됩니다.

## 스택

- React 18 + TypeScript + **Vite**
- **Ant Design v5** (엔터프라이즈 컴포넌트) + 시트39 Navy/Gray 디자인 토큰
- **Refine** (`@refinedev/core`, `@refinedev/antd`) — CRUD/리소스/알림
- react-router v7, 인메모리 Mock Store(localStorage 영속) + Audit 로깅
- Vitest (단위/스모크 테스트)

## 실행

```bash
npm install
npm run dev      # http://localhost:9001  (전역 규칙: 8000 금지)
npm test         # 단위/스모크/접근 테스트
npm run build    # 타입체크 + 프로덕션 빌드
```

데이터를 초기화하려면 브라우저 콘솔에서 `localStorage.clear()` 후 새로고침.

### 백엔드(Node/TS stub) 연결 — 선택

기본은 인메모리 Mock. 실제 REST 백엔드에 연결하려면:

```bash
# 1) 백엔드 stub 실행 (별도 터미널)
cd server && npm install && npm run dev   # http://localhost:9100 (Swagger UI: /docs)

# 2) 프론트에 API URL 지정 후 재시작
cp .env.example .env.local                # VITE_API_URL=http://localhost:9100
npm run dev
```

연결되면 헤더 배지가 **Mock → Backend** 로 바뀌고, 데이터가 `/api/bootstrap`으로 hydrate됩니다.
`dataProvider`만 `restDataProvider`로 교체되는 구조(안 A 핵심) — OpenAPI는 `http://localhost:9100/openapi.json`, 문서는 `/docs`.

### 다크 모드

헤더의 🌙 버튼으로 라이트/다크 전환 (localStorage 영속).

## 화면 (시트 35 네비게이션)

| 경로 | 화면 | 시트 |
|---|---|---|
| `/` | Portfolio Dashboard | UI-055 |
| `/requests/new` | Feature Request Form | UI-001 |
| `/intake` | Intake Review Board + Owner Assignment | UI-005/006 |
| `/features`, `/features/:id` | Registry List / Feature Detail | UI-007/008 |
| `/lifecycle` | Lifecycle Dashboard | UI-009 |
| `/gates`, `/gates/:id` | 9 Gate Tracker | UI-037 |
| `/evidence` | Gate Evidence Management | UI-036 |
| `/supplier` | Supplier Evidence Portal (RBAC 격리) | UI-029 |
| `/release` | Release Readiness / Production Activation | UI-038~040 |
| `/operations` | Telemetry / KPI Dashboard | UI-043/046 |
| `/audit` | Audit Log (Export) | UI-053 |

## 데모 시나리오 (시트 41, 14-step)

상단 우측 **"데모 역할"** 셀렉터로 역할을 전환하며 RBAC(시트 23)를 체험합니다.

1. **Requester** 로 `/requests/new` 에서 Feature Request 작성 → Submit
2. **PMO** 로 `/intake` 에서 요청 선택 → Owner 지정(Product Owner 필수) → **Approve** → 공식 Feature ID 발급(Lifecycle=Proposed)
3. `/gates` 에서 Feature 선택 → 담당 역할로 전환하며 게이트 PASS 설정
   - RG1·RG2·RG3 PASS → 자동으로 **Approved**
   - RG7 PASS → **Developing**, RG4·RG5·RG6 PASS → **Verified**
4. **Release Owner** 로 `/release` → 9/9 PASS면 **GO** 승인 → **Released**
5. `/audit` 에서 모든 결정의 actor/time/before→after 추적, Export
6. **예외(시트41 step14):** RG8=PASS, RG5=PENDING 으로 두면 Production 판단이 **HOLD** (OTA가 Verification을 덮어쓰지 않음) — `src/domain/gateLogic.test.ts` 로 회귀 보호.

## 구조

```
src/
  domain/      types, codeMaster(시트07/16/39), gateLogic(시트14/41) + test
  data/        seed(시트41), store(Audit), dataProvider(Refine), useStore 훅
  auth/        rbac(시트23), RoleContext(역할 전환)
  theme/       tokens(시트39 Navy/Gray)
  components/  CMP-001~014 공용 컴포넌트
  pages/       12개 화면
```
