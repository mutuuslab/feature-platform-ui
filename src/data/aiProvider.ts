// AI 어시스트 추상화 레이어.
// dataProvider 의 Mock↔Backend 패턴과 동일: 기본은 정적 Mock(키 불필요, GitHub Pages 에서 동작),
// VITE_API_URL 백엔드 연결 시 실제 Claude(claude-opus-4-8) 호출로 자동 전환.
//   - 백엔드 엔드포인트: POST {API_URL}/api/ai/:task   (server/index.ts 의 /api/ai 핸들러)
//   - 4개 task: draft(초안 보강) · review(완성도 검토) · dedup(중복 탐지) · summarize(요약)
import { API_URL, USE_BACKEND } from "./apiConfig";

export type AiTask = "draft" | "review" | "dedup" | "summarize";

export interface DraftInput {
  name: string;
  idea: string; // 한 줄 아이디어 또는 고객 니즈
  needsSource?: string;
}
export interface DraftResult {
  customerNeeds: string;
  reviewBackground: string;
  devAgreement: string;
  expectedValue: string;
  techConcept: string;
  useCase: string;
  competitorTrend: string;
}

export interface ReviewInput {
  request: Record<string, unknown>;
}
export interface ReviewSuggestion {
  field: string;
  label: string;
  advice: string;
  severity: "필수" | "권장";
}
export interface ReviewResult {
  score: number; // 0~100
  level: "상" | "중" | "하";
  oneLine: string;
  strengths: string[];
  suggestions: ReviewSuggestion[];
}

export interface DedupInput {
  name: string;
  idea?: string;
  existing: { id: string; name: string; kind: string }[];
}
export interface DedupCandidate {
  id: string;
  name: string;
  kind: string;
  similarity: number; // 0~1
  reason: string;
}
export interface DedupResult {
  verdict: "NO_DUPLICATE" | "REVIEW_RECOMMENDED" | "LIKELY_DUPLICATE";
  candidates: DedupCandidate[];
}

export interface SummarizeInput {
  request: Record<string, unknown>;
}
export interface SummarizeResult {
  summary: string;
  bullets: string[];
}

/** AI 응답이 Mock(시뮬레이션)인지 실제 Claude인지 표시 — UI 배지용 */
export const aiMode = (): "claude" | "mock" => (USE_BACKEND ? "claude" : "mock");

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callBackend<T>(task: AiTask, payload: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/ai/${task}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`AI 백엔드 오류 (${res.status})`);
  return (await res.json()) as T;
}

// ──────────────────────────────────────────────────────────────
// Mock 구현 — 입력을 반영한 결정적(deterministic) 생성. 실제 Claude 미연결 시 사용.
// ──────────────────────────────────────────────────────────────
function mockDraft({ name, idea, needsSource }: DraftInput): DraftResult {
  const f = name?.trim() || "신규 Feature";
  const seed = idea?.trim() || "고객 편의성 향상";
  return {
    customerNeeds:
      `- ${needsSource ?? "품질대외지수"} 기반 Back-up Data: "${seed}" 관련 불만/요구 지속 증가\n` +
      `- MI/시장 조사 기반, 동급 차량 대비 ${f} 미적용에 따른 상품성 갭 식별`,
    reviewBackground:
      `- 시장·기술 동향: ${f} 관련 기능이 프리미엄 → 볼륨 세그먼트로 빠르게 확산 중\n` +
      `- 법규/표준: 관련 안전·데이터 규제 강화 추세로 선제적 대응 필요`,
    devAgreement:
      `- AVP 개발 부문과 사전 Feasibility 검토 완료: 기존 HW 플랫폼에서 SW/OTA 기반 구현 가능 판단\n` +
      `- 추가 센서/제어기 의존성 및 검증 범위는 RG2 단계에서 상세 협의 예정`,
    expectedValue:
      `- 상품성: 동급 경쟁 대비 차별화 포인트 확보 (고객 체감 가치 ↑)\n` +
      `- 수익성: 옵션/구독 형태 수익화 가능, 적용 차종 확대 시 규모의 경제\n` +
      `- 안전성: ${seed} 관련 리스크 저감 기여`,
    techConcept:
      `- 정의: ${f} — ${seed}을(를) 실현하는 차량 기능\n` +
      `- 구성: 차량 센서/제어기 입력 → 판단 로직 → HMI/액추에이터 출력\n` +
      `- 적용 조건: 필수 HW(센서/제어기), SW 버전, 제어 권한 범위는 RG3 정책에서 확정`,
    useCase:
      `- 주 사용 상황: 일상 주행/주차 중 ${seed} 필요 시 자동 또는 운전자 트리거로 동작\n` +
      `- 주변 환경: 도심·고속·주차장 등 다양한 환경에서 안정 동작 목표`,
    competitorTrend:
      `- 동종 산업: 주요 OEM 2~3사가 유사 기능을 상위 트림 중심으로 출시\n` +
      `- 이종 산업: 모바일/가전의 개인화·구독 UX가 차량으로 유입되는 흐름`,
  };
}

const FIELD_LABELS: Record<string, string> = {
  name: "Feature 제안명",
  customerNeeds: "고객 니즈",
  reviewBackground: "검토 배경",
  devAgreement: "개발 협의",
  expectedValue: "기대효과",
  techConcept: "기술 컨셉",
  useCase: "유즈케이스",
  competitorTrend: "경쟁사 동향",
  applyScope: "적용 범위(권역×브랜드)",
  relatedDepts: "유관 부서",
};

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.values(v as object).every((x) => isEmpty(x));
  return false;
}

function mockReview({ request }: ReviewInput): ReviewResult {
  const required = ["name", "customerNeeds", "applyScope"];
  const recommended = ["techConcept", "expectedValue", "useCase", "relatedDepts", "reviewBackground"];
  const suggestions: ReviewSuggestion[] = [];
  for (const f of required)
    if (isEmpty(request[f]))
      suggestions.push({ field: f, label: FIELD_LABELS[f] ?? f, severity: "필수", advice: `${FIELD_LABELS[f] ?? f}은(는) 접수 필수 항목입니다. 작성해 주세요.` });
  for (const f of recommended)
    if (isEmpty(request[f]))
      suggestions.push({ field: f, label: FIELD_LABELS[f] ?? f, severity: "권장", advice: `${FIELD_LABELS[f] ?? f}을(를) 보강하면 Intake 심의 통과율이 높아집니다.` });

  // 길이 기반 품질 힌트
  const cn = String(request.customerNeeds ?? "");
  if (cn && cn.length < 40)
    suggestions.push({ field: "customerNeeds", label: "고객 니즈", severity: "권장", advice: "고객 니즈가 다소 짧습니다. 정량 근거(지수/조사 수치)를 1~2개 추가해 보세요." });
  const ev = String(request.expectedValue ?? "");
  if (ev && !/[0-9%]/.test(ev))
    suggestions.push({ field: "expectedValue", label: "기대효과", severity: "권장", advice: "기대효과에 구체적 수치(%, 금액, 건수)를 포함하면 설득력이 높아집니다." });

  const reqCount = required.filter((f) => !isEmpty(request[f])).length;
  const recCount = recommended.filter((f) => !isEmpty(request[f])).length;
  const score = Math.round((reqCount / required.length) * 55 + (recCount / recommended.length) * 45);
  const level: ReviewResult["level"] = score >= 80 ? "상" : score >= 55 ? "중" : "하";

  const strengths: string[] = [];
  if (!isEmpty(request.name)) strengths.push("제안명이 명확합니다.");
  if (!isEmpty(request.applyScope)) strengths.push("적용 범위(권역×브랜드)가 지정되어 있습니다.");
  if (!isEmpty(request.techConcept)) strengths.push("기술 컨셉이 구체적으로 기술되었습니다.");
  if (strengths.length === 0) strengths.push("기본 골격은 갖춰져 있습니다.");

  const oneLine =
    level === "상" ? "접수 준비가 거의 완료된 우수한 제안서입니다."
    : level === "중" ? "핵심 항목은 갖춰졌으나 일부 보강이 필요합니다."
    : "필수 항목이 비어 있어 접수가 반려될 수 있습니다.";

  return { score, level, oneLine, strengths, suggestions };
}

function tokenize(s: string): Set<string> {
  return new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2),
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((w) => b.has(w) && (inter += 1));
  return inter / (a.size + b.size - inter);
}

function mockDedup({ name, idea, existing }: DedupInput): DedupResult {
  const q = tokenize(`${name} ${idea ?? ""}`);
  const candidates: DedupCandidate[] = existing
    .map((e) => {
      const sim = jaccard(q, tokenize(e.name));
      return { ...e, similarity: Math.round(sim * 100) / 100, reason: sim >= 0.5 ? "제안명/키워드가 상당 부분 겹칩니다." : "일부 키워드가 유사합니다." };
    })
    .filter((c) => c.similarity >= 0.2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
  const top = candidates[0]?.similarity ?? 0;
  const verdict: DedupResult["verdict"] = top >= 0.6 ? "LIKELY_DUPLICATE" : top >= 0.3 ? "REVIEW_RECOMMENDED" : "NO_DUPLICATE";
  return { verdict, candidates };
}

function mockSummarize({ request }: SummarizeInput): SummarizeResult {
  const name = String(request.name ?? "신규 Feature");
  const region = (() => {
    const scope = request.applyScope as Record<string, string[]> | undefined;
    const regions = scope ? Object.entries(scope).filter(([, b]) => b?.length).map(([r]) => r) : [];
    return regions.length ? regions.join("/") : "권역 미정";
  })();
  const needs = String(request.customerNeeds ?? "").split("\n")[0].replace(/^[-\s]+/, "") || "고객 니즈 기반 제안";
  const value = String(request.expectedValue ?? "").split("\n")[0].replace(/^[-\s]+/, "") || "상품성/수익성 기대";
  return {
    summary: `${name} — ${needs}. 적용 권역 ${region}, ${value}.`,
    bullets: [
      `제안: ${name}`,
      `니즈: ${needs}`,
      `적용 범위: ${region}`,
      `기대효과: ${value}`,
      `Deploy: ${String(request.deployType ?? "Binary OTA")}`,
    ],
  };
}

// ──────────────────────────────────────────────────────────────
// 공개 API — task별 호출. 백엔드 연결 시 실제 Claude, 아니면 Mock.
// ──────────────────────────────────────────────────────────────
export async function aiDraft(input: DraftInput): Promise<DraftResult> {
  if (USE_BACKEND) return callBackend<DraftResult>("draft", input);
  await delay(750);
  return mockDraft(input);
}
export async function aiReview(input: ReviewInput): Promise<ReviewResult> {
  if (USE_BACKEND) return callBackend<ReviewResult>("review", input);
  await delay(600);
  return mockReview(input);
}
export async function aiDedup(input: DedupInput): Promise<DedupResult> {
  if (USE_BACKEND) return callBackend<DedupResult>("dedup", input);
  await delay(500);
  return mockDedup(input);
}
export async function aiSummarize(input: SummarizeInput): Promise<SummarizeResult> {
  if (USE_BACKEND) return callBackend<SummarizeResult>("summarize", input);
  await delay(500);
  return mockSummarize(input);
}
