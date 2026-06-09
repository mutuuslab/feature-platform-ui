// 플릿 스케일 데이터 — 수백만 대 차량 통제 (시트 64 Rollout Control Playbook, 06 KPI-REL/OPS).
// OTA/Policy 배포는 VIN Eligibility → Wave 확산(blast radius) → GO/HOLD/ROLLBACK 순으로 통제된다.

export interface FleetProfile {
  featureId: string;
  registeredFleet: number; // 등록 차량 총수
  eligibleVins: number; // Eligibility 통과 차량
  activated: number; // 현재 활성화된 차량
  waves: RolloutWave[];
}

export type WaveStatus = "DEPLOYED" | "MONITORING" | "GO" | "HOLD" | "PENDING" | "ROLLBACK";

export interface RolloutWave {
  wave: string;
  pct: number;
  target: number; // 대상 차량수
  activated: number;
  successRate: number; // %
  failureRate: number; // %
  status: WaveStatus;
}

function wave(name: string, pct: number, eligible: number, status: WaveStatus, success = 0, failure = 0): RolloutWave {
  const target = Math.round(eligible * pct);
  return {
    wave: name,
    pct: pct * 100,
    target,
    activated: status === "DEPLOYED" || status === "GO" || status === "MONITORING" ? Math.round(target * (success / 100)) : 0,
    successRate: success,
    failureRate: failure,
    status,
  };
}

export const FLEET: Record<string, FleetProfile> = {
  "FEAT-DST-003": (() => {
    const eligible = 1_840_000;
    return {
      featureId: "FEAT-DST-003",
      registeredFleet: 2_410_000,
      eligibleVins: eligible,
      activated: 1_690_000,
      waves: [
        wave("Pilot 1%", 0.01, eligible, "GO", 99.2, 0.8),
        wave("Wave 5%", 0.05, eligible, "GO", 98.7, 1.3),
        wave("Wave 25%", 0.25, eligible, "GO", 98.1, 1.9),
        wave("Wave 100%", 1.0, eligible, "MONITORING", 91.8, 2.4),
      ],
    };
  })(),
  "FEAT-ALK-002": (() => {
    const eligible = 980_000;
    return {
      featureId: "FEAT-ALK-002",
      registeredFleet: 1_250_000,
      eligibleVins: eligible,
      activated: 9_800,
      waves: [
        wave("Pilot 1%", 0.01, eligible, "MONITORING", 97.3, 2.7),
        wave("Wave 5%", 0.05, eligible, "HOLD"),
        wave("Wave 25%", 0.25, eligible, "PENDING"),
        wave("Wave 100%", 1.0, eligible, "PENDING"),
      ],
    };
  })(),
  "FEAT-RPA-001": (() => {
    const eligible = 320_000;
    return {
      featureId: "FEAT-RPA-001",
      registeredFleet: 540_000,
      eligibleVins: eligible,
      activated: 0,
      waves: [
        wave("Pilot 1%", 0.01, eligible, "PENDING"),
        wave("Wave 5%", 0.05, eligible, "PENDING"),
        wave("Wave 25%", 0.25, eligible, "PENDING"),
        wave("Wave 100%", 1.0, eligible, "PENDING"),
      ],
    };
  })(),
};

export const FLEET_TOTALS = {
  registered: 4_200_000,
  underManagement: 4_200_000,
  activeFeatures: 2_700_000,
  monitored: 4_116_000, // 98% telemetry coverage
};

export function fmtVeh(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

const WAVE_COLOR: Record<WaveStatus, string> = {
  DEPLOYED: "#15803d",
  GO: "#15803d",
  MONITORING: "#0891b2",
  HOLD: "#b45309",
  PENDING: "#94a3b8",
  ROLLBACK: "#b91c1c",
};
export const waveColor = (s: WaveStatus) => WAVE_COLOR[s];
