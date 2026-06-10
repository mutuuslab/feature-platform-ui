// Feature Taxonomy — L0~L5 계층·경계·ID 규칙 (기능명세 02-2). L2 = 기준 Feature Master.
// Taxonomy는 Feature ID의 의미·소유·검증·배포 경계를 고정해 Topology의 Parent/Child와 영향도 단위를 일관되게 만든다.
import type { Feature } from "./types";

export type TaxonomyLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
export const TAXONOMY_LEVELS: TaxonomyLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5"];

export interface LevelMeta {
  level: TaxonomyLevel;
  purpose: string; // 관리 목적
  featureType: string; // FeatureType 라벨
  registryObject: string;
  requiredLink: string;
  deployable: boolean; // L0/L1 = false (직접 배포 대상 아님)
}

export const LEVEL_META: Record<TaxonomyLevel, LevelMeta> = {
  L0: { level: "L0", purpose: "기능 그룹·전략 영역", featureType: "Domain / Capability", registryObject: "TaxonomyNode", requiredLink: "L1 child", deployable: false },
  L1: { level: "L1", purpose: "상품·고객 가치", featureType: "Customer / Business Feature", registryObject: "Feature Cluster", requiredLink: "L2 child", deployable: false },
  L2: { level: "L2", purpose: "차량 동작·시스템 요구사항 기준", featureType: "Vehicle / System Feature", registryObject: "Feature Master", requiredLink: "Requirement · Variant · Test", deployable: true },
  L3: { level: "L3", purpose: "SW 구현·협력사 개발 단위", featureType: "Software Feature", registryObject: "Feature / Supplier Function", requiredLink: "SWC · ECU · Supplier", deployable: true },
  L4: { level: "L4", purpose: "Feature 제어 수단", featureType: "Policy / Flag / Parameter", registryObject: "ControlPoint", requiredLink: "Policy · Safe Default", deployable: true },
  L5: { level: "L5", purpose: "구현 상세·I/F 원소", featureType: "Code / Signal / Logic", registryObject: "Implementation Item", requiredLink: "API · Signal · DTC", deployable: true },
};

export const featureTypeFor = (lvl: TaxonomyLevel) => LEVEL_META[lvl].featureType;

// ── L0 도메인(+ID 코드) / L1 클러스터 정적 트리 ──
export interface DomainNode { code: string; name: string; clusters: string[]; }
export const DOMAINS: DomainNode[] = [
  { code: "BDC", name: "Body Comfort", clusters: ["Remote Door Lock", "Seat Comfort", "Climate Pre-Conditioning"] },
  { code: "RPA", name: "ADAS / 자율주행", clusters: ["Remote Parking", "Lane Keeping", "Collision Avoidance"] },
  { code: "CNT", name: "Connectivity / 커넥티드", clusters: ["Remote Control", "OTA Service", "Digital Key"] },
  { code: "INF", name: "Infotainment", clusters: ["Streaming", "Navigation", "Voice"] },
  { code: "PWT", name: "Powertrain / 전동화", clusters: ["Drive Mode", "Charging", "Range"] },
  { code: "SEC", name: "Safety / Security", clusters: ["Cybersecurity", "Functional Safety"] },
];
export const domainByCode = (c?: string) => DOMAINS.find((d) => d.code === c);

// 제안 category(FeatureRequestPage CATEGORIES) → 도메인 매핑
export function domainForCategory(category?: string): DomainNode {
  const c = (category ?? "").toLowerCase();
  if (c.includes("adas") || c.includes("자율")) return DOMAINS[1];
  if (c.includes("connect") || c.includes("커넥")) return DOMAINS[2];
  if (c.includes("infotain")) return DOMAINS[3];
  if (c.includes("powertrain") || c.includes("전동")) return DOMAINS[4];
  if (c.includes("safety") || c.includes("security")) return DOMAINS[5];
  if (c.includes("body")) return DOMAINS[0];
  return DOMAINS[1];
}

// ── ID 규칙: L2 = FEAT-{DOMAIN}-{NNN}, L4 = CP-{FEATURE}-{TYPE} ──
export const pad3 = (n: number) => String(n).padStart(3, "0");
export const makeFeatureId = (domainCode: string, seq: number) => `FEAT-${domainCode}-${pad3(seq)}`;
export const FEATURE_ID_RE = /^FEAT-[A-Z]{2,5}-\d{3}$/;
export const isValidFeatureId = (id: string) => FEATURE_ID_RE.test((id ?? "").trim());
export const makeControlPointId = (featureId: string, type: string) => `CP-${featureId.replace(/^FEAT-/, "")}-${type.toUpperCase()}`;

export function nextSeqForDomain(domainCode: string, existingIds: string[]): number {
  let max = 0;
  const re = new RegExp(`^FEAT-${domainCode}-(\\d{3})$`);
  for (const id of existingIds) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
export function suggestFeatureId(category: string | undefined, existingIds: string[]): string {
  const d = domainForCategory(category);
  return makeFeatureId(d.code, nextSeqForDomain(d.code, existingIds));
}

// ── 시드 4건의 도메인/클러스터(표시·Topology용) ──
const KNOWN: Record<string, { domain: string; cluster: string }> = {
  "FEAT-RPA-001": { domain: "ADAS / 자율주행", cluster: "Remote Parking" },
  "FEAT-ALK-002": { domain: "ADAS / 자율주행", cluster: "Lane Keeping" },
  "FEAT-DST-003": { domain: "Powertrain / 전동화", cluster: "Drive Mode" },
  "FEAT-VFC-004": { domain: "Body Comfort", cluster: "Climate Pre-Conditioning" },
};

export interface ResolvedTaxonomy {
  level: TaxonomyLevel;
  featureType: string;
  displayName: string;
  internalAlias: string;
  ownerOrg: string;
  domain: string; // L0
  cluster: string; // L1 (parent)
  traceabilityRoot: string;
}

// Feature → 표시용 taxonomy (저장값 우선, 없으면 합리적 기본값 도출)
export function resolveTaxonomy(f: Feature): ResolvedTaxonomy {
  const level = (f.taxonomyLevel ?? "L2") as TaxonomyLevel;
  const known = KNOWN[f.id];
  const codeFromId = /^FEAT-([A-Z]{2,5})-/.exec(f.id)?.[1];
  const domain = known?.domain ?? domainByCode(codeFromId)?.name ?? (codeFromId ? `${codeFromId} 도메인` : "미분류");
  return {
    level,
    featureType: f.featureType ?? featureTypeFor(level),
    displayName: f.displayName ?? f.name,
    internalAlias: f.internalAlias ?? "",
    ownerOrg: f.ownerOrg ?? f.owners?.productOwner ?? "—",
    domain,
    cluster: f.parentFeatureId ?? known?.cluster ?? "미지정",
    traceabilityRoot: f.traceabilityRoot ?? f.id,
  };
}

// ── Consistency Rules T-001~T-004 ──
export interface RuleResult { id: string; label: string; applies: boolean; pass: boolean; }
export function checkTaxonomyRules(
  f: Pick<Feature, "taxonomyLevel" | "parentFeatureId">,
  opts?: { hasRequirement?: boolean },
): { status: "PASS" | "WARN"; rules: RuleResult[] } {
  const lvl = (f.taxonomyLevel ?? "L2") as TaxonomyLevel;
  const hasParent = Boolean(f.parentFeatureId);
  const rules: RuleResult[] = [
    { id: "T-001", label: "L2 Feature는 Parent(L1)와 최소 1개 Requirement 보유", applies: lvl === "L2", pass: hasParent && (opts?.hasRequirement ?? true) },
    { id: "T-002", label: "L4 Control Point는 L2/L3 Feature에 귀속", applies: lvl === "L4", pass: hasParent },
    { id: "T-003", label: "L3 Feature는 SWC/ECU/Supplier 중 1개 이상 연결", applies: lvl === "L3", pass: hasParent },
    { id: "T-004", label: "L0/L1은 DeploymentUnit 직접 연결 금지", applies: lvl === "L0" || lvl === "L1", pass: !LEVEL_META[lvl].deployable },
  ];
  const applicable = rules.filter((r) => r.applies);
  const status = applicable.length === 0 || applicable.every((r) => r.pass) ? "PASS" : "WARN";
  return { status, rules };
}
