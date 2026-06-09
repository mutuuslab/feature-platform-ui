// 차량 모집단 + 시드 차량 DB — region/trim/MY/HW/SW/Option/Entitlement/Connectivity 조건별 통제.
// (UI-017 Variant Rule, UI-018 VIN Eligibility, 05_Data_Model Vehicle Capability)
import type { GateStatus } from "../domain/types";

export const OPTION_CODES = ["ADAS-L2", "PREM-AUDIO", "TOW-PKG", "AWD", "HUD"] as const;
export type OptionCode = (typeof OPTION_CODES)[number];
export const HW_VERSIONS = ["HW2", "HW3", "HW4"] as const;
export type HwVersion = (typeof HW_VERSIONS)[number];

export interface Segment {
  region: string;
  trim: string;
  count: number;
  shares: {
    my2024plus: number;
    sw3: number; // SW >= 3.0
    entitled: number;
    connected: number;
    hw: Record<HwVersion, number>; // 분포 합 1
    options: Record<OptionCode, number>; // 옵션 장착률
  };
}

const REGIONS: { id: string; count: number }[] = [
  { id: "KR", count: 1_050_000 },
  { id: "EU", count: 1_180_000 },
  { id: "US", count: 1_260_000 },
  { id: "CN", count: 520_000 },
  { id: "Other", count: 190_000 },
];

interface TrimProfile {
  id: string;
  share: number;
  my2024plus: number;
  sw3: number;
  entitled: number;
  connected: number;
  hw: Record<HwVersion, number>;
  options: Record<OptionCode, number>;
}

const TRIMS: TrimProfile[] = [
  { id: "Standard", share: 0.45, my2024plus: 0.55, sw3: 0.4, entitled: 0.1, connected: 0.8, hw: { HW2: 0.4, HW3: 0.4, HW4: 0.2 }, options: { "ADAS-L2": 0.3, "PREM-AUDIO": 0.2, "TOW-PKG": 0.25, AWD: 0.3, HUD: 0.05 } },
  { id: "Premium", share: 0.3, my2024plus: 0.7, sw3: 0.65, entitled: 0.35, connected: 0.92, hw: { HW2: 0.15, HW3: 0.4, HW4: 0.45 }, options: { "ADAS-L2": 0.6, "PREM-AUDIO": 0.55, "TOW-PKG": 0.2, AWD: 0.5, HUD: 0.3 } },
  { id: "Sport", share: 0.15, my2024plus: 0.8, sw3: 0.8, entitled: 0.55, connected: 0.95, hw: { HW2: 0.05, HW3: 0.2, HW4: 0.75 }, options: { "ADAS-L2": 0.7, "PREM-AUDIO": 0.6, "TOW-PKG": 0.1, AWD: 0.7, HUD: 0.5 } },
  { id: "Signature", share: 0.1, my2024plus: 0.9, sw3: 0.9, entitled: 0.75, connected: 0.98, hw: { HW2: 0, HW3: 0.1, HW4: 0.9 }, options: { "ADAS-L2": 0.85, "PREM-AUDIO": 0.9, "TOW-PKG": 0.05, AWD: 0.8, HUD: 0.8 } },
];

export const REGION_IDS = REGIONS.map((r) => r.id);
export const TRIM_IDS = TRIMS.map((t) => t.id);

export const SEGMENTS: Segment[] = REGIONS.flatMap((r) =>
  TRIMS.map((t) => ({
    region: r.id,
    trim: t.id,
    count: Math.round(r.count * t.share),
    shares: { my2024plus: t.my2024plus, sw3: t.sw3, entitled: t.entitled, connected: t.connected, hw: t.hw, options: t.options },
  })),
);

export const TOTAL_FLEET = SEGMENTS.reduce((s, x) => s + x.count, 0);

export interface EligibilityRule {
  regions: string[];
  trims: string[];
  hwVersions: HwVersion[]; // 빈 배열 = 전체
  requireSw3: boolean;
  optionCodes: OptionCode[]; // 모두 장착 요구
  minModelYear2024: boolean;
  requireEntitlement: boolean;
  requireConnectivity: boolean;
}

export const EMPTY_RULE: EligibilityRule = {
  regions: [],
  trims: [],
  hwVersions: [],
  requireSw3: false,
  optionCodes: [],
  minModelYear2024: false,
  requireEntitlement: false,
  requireConnectivity: false,
};

function conditionFactor(seg: Segment, rule: EligibilityRule): number {
  let f = 1;
  if (rule.hwVersions.length) f *= rule.hwVersions.reduce((s, v) => s + (seg.shares.hw[v] ?? 0), 0);
  if (rule.requireSw3) f *= seg.shares.sw3;
  if (rule.minModelYear2024) f *= seg.shares.my2024plus;
  if (rule.requireEntitlement) f *= seg.shares.entitled;
  if (rule.requireConnectivity) f *= seg.shares.connected;
  rule.optionCodes.forEach((o) => (f *= seg.shares.options[o] ?? 0));
  return f;
}

function regionTrimMatched(seg: Segment, rule: EligibilityRule): boolean {
  const rOk = rule.regions.length === 0 || rule.regions.includes(seg.region);
  const tOk = rule.trims.length === 0 || rule.trims.includes(seg.trim);
  return rOk && tOk;
}

export function eligibleOfSegment(seg: Segment, rule: EligibilityRule): number {
  if (!regionTrimMatched(seg, rule)) return 0;
  return Math.round(seg.count * conditionFactor(seg, rule));
}

export interface EligibilityResult {
  total: number;
  eligible: number;
  pct: number;
  byRegion: { region: string; count: number; eligible: number }[];
  byTrim: { trim: string; count: number; eligible: number }[];
  matrix: { region: string; trim: string; count: number; eligible: number }[];
}

export function evaluateFleet(rule: EligibilityRule): EligibilityResult {
  const matrix = SEGMENTS.map((s) => ({ region: s.region, trim: s.trim, count: s.count, eligible: eligibleOfSegment(s, rule) }));
  const eligible = matrix.reduce((s, x) => s + x.eligible, 0);
  const byRegion = REGION_IDS.map((region) => {
    const cells = matrix.filter((m) => m.region === region);
    return { region, count: cells.reduce((s, x) => s + x.count, 0), eligible: cells.reduce((s, x) => s + x.eligible, 0) };
  });
  const byTrim = TRIM_IDS.map((trim) => {
    const cells = matrix.filter((m) => m.trim === trim);
    return { trim, count: cells.reduce((s, x) => s + x.count, 0), eligible: cells.reduce((s, x) => s + x.eligible, 0) };
  });
  return { total: TOTAL_FLEET, eligible, pct: TOTAL_FLEET ? (eligible / TOTAL_FLEET) * 100 : 0, matrix, byRegion, byTrim };
}

// ── 시드 차량 DB (store에 적재) ──────────────────────────────
export interface VehicleRecord {
  id: string; // VIN
  region: string;
  trim: string;
  modelYear: number;
  hw: HwVersion;
  sw: string;
  options: OptionCode[];
  entitled: boolean;
  connected: boolean;
  customer: string;
}

// 결정적 hash (Date/random 미사용)
function h(seed: number, shift = 0): number {
  return (((seed * 2654435761) >>> shift) % 1000) / 1000;
}
function pickHw(dist: Record<HwVersion, number>, r: number): HwVersion {
  let acc = 0;
  for (const v of HW_VERSIONS) {
    acc += dist[v];
    if (r <= acc) return v;
  }
  return "HW4";
}

// region×trim 분포에 비례해 수백 대 시드 차량 생성 (실데이터화). 기본 420대.
export function buildVehicles(n = 420): VehicleRecord[] {
  const out: VehicleRecord[] = [];
  let idx = 0;
  for (const seg of SEGMENTS) {
    const cnt = Math.max(1, Math.round((n * seg.count) / TOTAL_FLEET));
    for (let k = 0; k < cnt; k += 1) {
      const seed = idx * 97 + 13;
      const my2024 = h(seed, 0) < seg.shares.my2024plus;
      const modelYear = my2024 ? 2024 + (idx % 3) : 2022 + (idx % 2);
      const hw = pickHw(seg.shares.hw, h(seed, 2));
      const sw3 = h(seed, 3) < seg.shares.sw3;
      const sw = sw3 ? (idx % 2 ? "3.2" : "3.0") : idx % 2 ? "2.4" : "1.8";
      const options = OPTION_CODES.filter((o, oi) => h(seed, 5 + oi) < seg.shares.options[o]);
      const vin = `KMH${seg.region[0]}${seg.trim[0]}${(100000 + idx).toString(36).toUpperCase()}`;
      out.push({
        id: vin,
        region: seg.region,
        trim: seg.trim,
        modelYear,
        hw,
        sw,
        options,
        entitled: h(seed, 11) < seg.shares.entitled,
        connected: h(seed, 13) < seg.shares.connected,
        customer: `CUS-${(20000 + idx * 131).toString().padStart(7, "0")}`,
      });
      idx += 1;
    }
  }
  return out;
}

// Rule → 사람이 읽는 Runtime Policy 조건식 (UI-024 Policy Rule Builder 연동)
export function ruleToPolicyExpression(rule: EligibilityRule): string {
  const parts: string[] = [];
  if (rule.regions.length) parts.push(`region ∈ {${rule.regions.join(", ")}}`);
  if (rule.trims.length) parts.push(`trim ∈ {${rule.trims.join(", ")}}`);
  if (rule.hwVersions.length) parts.push(`hw ∈ {${rule.hwVersions.join(", ")}}`);
  if (rule.requireSw3) parts.push("sw >= 3.0");
  if (rule.minModelYear2024) parts.push("modelYear >= 2024");
  if (rule.optionCodes.length) parts.push(`options ⊇ {${rule.optionCodes.join(", ")}}`);
  if (rule.requireEntitlement) parts.push("entitlement.active == true");
  if (rule.requireConnectivity) parts.push("connectivity == online");
  return parts.length ? parts.join(" && ") : "true  /* 전체 차량 (조건 없음) */";
}

export interface VinCheck {
  label: string;
  required: boolean;
  pass: boolean;
  detail: string;
}

export function checkVehicle(v: VehicleRecord, rule: EligibilityRule): { eligible: boolean; checks: VinCheck[] } {
  const checks: VinCheck[] = [
    { label: "Region", required: rule.regions.length > 0, pass: rule.regions.length === 0 || rule.regions.includes(v.region), detail: v.region },
    { label: "Trim", required: rule.trims.length > 0, pass: rule.trims.length === 0 || rule.trims.includes(v.trim), detail: v.trim },
    { label: `HW (${rule.hwVersions.join("/") || "any"})`, required: rule.hwVersions.length > 0, pass: rule.hwVersions.length === 0 || rule.hwVersions.includes(v.hw), detail: v.hw },
    { label: "SW ≥ 3.0", required: rule.requireSw3, pass: !rule.requireSw3 || parseFloat(v.sw) >= 3.0, detail: v.sw },
    { label: "Model Year ≥ 2024", required: rule.minModelYear2024, pass: !rule.minModelYear2024 || v.modelYear >= 2024, detail: String(v.modelYear) },
    { label: `Options (${rule.optionCodes.join(",") || "none"})`, required: rule.optionCodes.length > 0, pass: rule.optionCodes.every((o) => v.options.includes(o)), detail: v.options.join(", ") || "—" },
    { label: "Entitlement", required: rule.requireEntitlement, pass: !rule.requireEntitlement || v.entitled, detail: v.entitled ? "Entitled" : "Not entitled" },
    { label: "Connectivity", required: rule.requireConnectivity, pass: !rule.requireConnectivity || v.connected, detail: v.connected ? "Online" : "Offline" },
  ];
  return { eligible: checks.every((c) => c.pass), checks };
}

export function fmtVeh(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

// Wave별 Rule (점진 확대) — Pilot은 좁게, 후속 Wave로 확대
export interface WaveRule {
  wave: string;
  rule: EligibilityRule;
  eligible: number;
}

// 적용된 Rule을 store에 저장하기 위한 레코드 (Feature당 Wave별 Rule 집합)
export interface EligibilityRuleRecord {
  id: string; // = featureId
  version: number;
  waveRules: WaveRule[];
  rg3Before?: GateStatus; // 최초 적용 전 RG3 상태 (③ 전체 롤백 시 복원)
  appliedBy: string;
  appliedAt: string;
}

// ② 적용 이력 (버전 관리/롤백)
export interface EligibilityVersionRecord {
  id: string; // ${featureId}-v${version}
  featureId: string;
  version: number;
  waveRules: WaveRule[];
  appliedBy: string;
  appliedAt: string;
}

// ③ VIN별 활성화 상태 (Feature 단위)
export type ActivationStatus = "ACTIVATED" | "FAILED" | "SAFE_DEFAULT";
export interface ActivationRecord {
  id: string; // ${featureId}::${vin}
  featureId: string;
  vin: string;
  wave: string;
  status: ActivationStatus;
  at: string;
}

// ① 차량이 처음 eligible해지는 Wave (증분 배포 = 신규 차량만). 없으면 null.
export function firstEligibleWave(v: VehicleRecord, waveRules: WaveRule[]): string | null {
  for (const wr of waveRules) {
    if (checkVehicle(v, wr.rule).eligible) return wr.wave;
  }
  return null;
}

// ② 활성화 실패 사유 (VIN 결정적)
const FAILURE_REASONS = ["Connectivity timeout", "Policy version mismatch", "HW capability check failed", "Entitlement sync delay", "OTA package verify error"];
export function failureReason(vin: string): string {
  const seed = vin.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FAILURE_REASONS[seed % FAILURE_REASONS.length];
}

// ② Field Issue (실패 클러스터 RCA → RG9/Field Ops 연계)
export interface FieldIssueRecord {
  id: string;
  featureId: string;
  severity: "High" | "Critical";
  affectedVins: number;
  rootCause: string;
  status: "OPEN" | "CLOSED";
  capaId: string; // 연계 CAPA
  rg9Before?: GateStatus; // Critical 이슈로 RG9 BLOCK 전 상태 (마감 시 복원)
  createdBy: string;
  createdAt: string;
}

export const DEFAULT_WAVES = ["Pilot 1%", "Wave 5%", "Wave 25%", "Wave 100%"];

// 점진 확대 데모 프리셋: Pilot(가장 좁음) → Wave 100%(전체 eligible)
export function progressivePreset(): EligibilityRule[] {
  return [
    { ...EMPTY_RULE, regions: ["KR"], trims: ["Signature"], hwVersions: ["HW4"], requireSw3: true, requireEntitlement: true, requireConnectivity: true },
    { ...EMPTY_RULE, regions: ["KR"], trims: ["Signature", "Sport"], hwVersions: ["HW4"], requireSw3: true, requireConnectivity: true },
    { ...EMPTY_RULE, regions: ["KR", "EU"], trims: ["Signature", "Sport", "Premium"], hwVersions: ["HW3", "HW4"], requireConnectivity: true },
    { ...EMPTY_RULE, hwVersions: ["HW3", "HW4"] },
  ];
}
