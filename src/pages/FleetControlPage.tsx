// 플릿 통제 — 수백만 대 차량 OTA/Policy 배포 통제 (시트 64 Rollout Playbook, UI-018/040/041/026).
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Progress, Row, Segmented, Space, Table, Tag, Tooltip, message } from "antd";
import { PlayCircleOutlined, PauseOutlined, ReloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { useList, useMutate, useOne, store } from "../data/useStore";
import type { Feature, Gate } from "../domain/types";
import { derivedLifecycleStatus } from "../domain/gateLogic";
import { FLEET, FLEET_TOTALS, waveColor, type RolloutWave } from "../data/fleet";
import { TOTAL_FLEET, fmtVeh, firstEligibleWave, failureReason, type ActivationRecord, type EligibilityRuleRecord, type FieldIssueRecord, type VehicleRecord } from "../data/population";
import { DataQualityBanner, PageHeader, confirmDecision } from "../components/Common";
import { StatTile } from "../components/viz/StatTile";
import { WaveBars, RadialProgress, KpiMultiLine } from "../components/viz/RCharts";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

type WaveRow = RolloutWave & { incremental: number; estActivated: number; estFailed: number; deployFraction: number };

const PLAYBOOK = [
  { id: "RCP-001", phase: "Pre-wave Readiness", check: "Mandatory gate PASS + rollback dry-run" },
  { id: "RCP-002", phase: "Target Segment Lock", check: "VIN eligibility = approved scope" },
  { id: "RCP-003", phase: "Pilot Wave (blast radius)", check: "Telemetry received in window" },
  { id: "RCP-005", phase: "Scale-up Decision", check: "CRITICAL=0, evidence complete" },
  { id: "RCP-007", phase: "Rollback / Kill-switch", check: "Trigger meets rollback rule" },
];

export function FleetControlPage() {
  const features = useList<Feature>("features").filter((f) => FLEET[f.id]);
  const mutate = useMutate();
  const { role, userName } = useRole();
  const [featureId, setFeatureId] = useState<string | undefined>(features.find((f) => f.status === "Released")?.id ?? features[0]?.id);
  const feature = features.find((f) => f.id === featureId);
  const fleetMeta = featureId ? FLEET[featureId] : undefined;
  const applied = useOne<EligibilityRuleRecord>("eligibilityRules", featureId);
  const canDeploy = can(role, "release.approve");

  const vehicles = useList<VehicleRecord>("vehicles");
  const activations = useList<ActivationRecord>("activations");
  const fieldIssues = useList<FieldIssueRecord>("fieldIssues").filter((f) => f.featureId === featureId);
  const waveRulesArr = applied?.waveRules ?? [];

  // ③ 시드 차량 활성화 레코드
  const featureActs = activations.filter((a) => a.featureId === featureId);
  const actByVin = new Map(featureActs.map((a) => [a.vin, a]));
  const seedActive = featureActs.filter((a) => a.status === "ACTIVATED").length;
  const seedFailed = featureActs.filter((a) => a.status === "FAILED").length;
  const seedSafe = featureActs.filter((a) => a.status === "SAFE_DEFAULT").length;
  const failedVins = featureActs.filter((a) => a.status === "FAILED");
  const seedByWave = (w: string) => vehicles.filter((v) => applied && firstEligibleWave(v, waveRulesArr) === w);
  const seedAssignCount = (w: string) => seedByWave(w).length;
  const recsOfWave = (w: string) => featureActs.filter((a) => a.wave === w);

  // ① Wave별 Cumulative + Incremental + 시드 비율 → 수백만 대 추정 활성화
  const waveRuleElig = new Map(waveRulesArr.map((w) => [w.wave, w.eligible]));
  const registered = applied ? TOTAL_FLEET : fleetMeta?.registeredFleet ?? 0;
  let prevCum = 0;
  const waves = (fleetMeta?.waves ?? []).map((w) => {
    const cumulative = applied ? waveRuleElig.get(w.wave) ?? 0 : Math.round((fleetMeta?.eligibleVins ?? 0) * (w.pct / 100));
    const incremental = Math.max(0, cumulative - prevCum);
    prevCum = cumulative;
    let estActivated = 0;
    let estFailed = 0;
    let deployFraction = 0;
    if (applied) {
      const assigned = seedAssignCount(w.wave);
      const recs = recsOfWave(w.wave);
      const seedDeployed = recs.length;
      deployFraction = assigned ? seedDeployed / assigned : 0;
      const successRatio = seedDeployed ? recs.filter((a) => a.status === "ACTIVATED").length / seedDeployed : 0;
      const failRatio = seedDeployed ? recs.filter((a) => a.status === "FAILED").length / seedDeployed : 0;
      estActivated = Math.round(incremental * deployFraction * successRatio);
      estFailed = Math.round(incremental * deployFraction * failRatio);
    } else {
      const isActive = w.status === "GO" || w.status === "MONITORING" || w.status === "DEPLOYED";
      estActivated = isActive ? Math.round(incremental * (w.successRate / 100)) : 0;
    }
    return { ...w, target: cumulative, incremental, estActivated, estFailed, deployFraction };
  });
  const eligible = applied ? waves[waves.length - 1]?.target ?? 0 : fleetMeta?.eligibleVins ?? 0;
  const estActivated = waves.reduce((s, w) => s + w.estActivated, 0);
  const estFailed = waves.reduce((s, w) => s + w.estFailed, 0);
  const eligibilityPct = registered ? Math.round((eligible / registered) * 100) : 0;
  const activationPct = eligible ? Math.round((estActivated / eligible) * 100) : 0;
  const seedTotalAssigned = applied ? vehicles.filter((v) => firstEligibleWave(v, waveRulesArr)).length : 0;

  // ② 활성화 실패 누적 시 자동 Kill Switch 권고 (KPI-OPS-002 Activation Failure Rate / KPI-RULE-001·002)
  const deployedCount = featureActs.filter((a) => a.status !== "SAFE_DEFAULT").length;
  const failureRateNow = deployedCount ? seedFailed / deployedCount : 0;
  const killRecommended = deployedCount >= 10 && failureRateNow >= 0.05;

  // 비모달 증분 배포 (수동 Deploy·시뮬레이션 공용). store에서 최신 상태를 읽어 신규 차량만 활성화.
  const deployWaveNow = (waveName: string): number => {
    if (!featureId) return 0;
    const rec = store.get<EligibilityRuleRecord>("eligibilityRules", featureId);
    if (!rec) return 0;
    const wr = rec.waveRules;
    const failRate = (fleetMeta?.waves.find((x) => x.wave === waveName)?.failureRate ?? 2) + 4;
    const actSet = new Set(store.list<ActivationRecord>("activations").filter((a) => a.featureId === featureId).map((a) => a.vin));
    const pending = store.list<VehicleRecord>("vehicles").filter((v) => firstEligibleWave(v, wr) === waveName && !actSet.has(v.id));
    if (!pending.length) return 0;
    mutate(() => {
      const now = new Date().toISOString();
      pending.forEach((v, i) => {
        const status: ActivationRecord["status"] = i % 100 < failRate ? "FAILED" : "ACTIVATED";
        store.create<ActivationRecord>("activations", { id: `${featureId}::${v.id}`, featureId, vin: v.id, wave: waveName, status, at: now });
      });
      store.audit({ actor: userName, action: "WAVE_DEPLOYED", objectType: "Feature", objectId: featureId, after: `${pending.length} new VINs @ ${waveName}`, reason: "Incremental rollout (new vehicles only)" });
    });
    return pending.length;
  };

  const deployWave = (w: RolloutWave) => {
    if (!feature || !applied) return;
    const pending = seedByWave(w.wave).filter((v) => !actByVin.has(v.id));
    if (!pending.length) { message.info(`${w.wave}: 신규 활성화 대상 없음`); return; }
    confirmDecision({
      title: `${w.wave} 증분 배포`,
      content: `신규 ${pending.length}대(시드)만 활성화합니다. 이미 활성화된 차량은 제외 (증분 배포). 시드 결과 비율로 수백만 대 대상에 추정 반영됩니다.`,
      onOk: () => { const n = deployWaveNow(w.wave); message.success(`${w.wave} 배포 — 신규 ${n}대 활성화 (증분)`); },
    });
  };

  // ③ Rollout 시간축 시뮬레이션 — 배치 단위 점진 배포 + 속도/일시정지/되감기
  const [simRunning, setSimRunning] = useState(false);
  const [simSeries, setSimSeries] = useState<{ step: string; activated: number; failed: number }[]>([]);
  const [simSpeed, setSimSpeed] = useState<"0.5x" | "1x" | "2x">("1x");
  const simRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const delayRef = useRef(900);
  useEffect(() => { delayRef.current = simSpeed === "0.5x" ? 1700 : simSpeed === "2x" ? 420 : 900; }, [simSpeed]);
  useEffect(() => () => { simRef.current = false; if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const BATCH = 28; // 틱당 활성화 차량수 (차트 점을 촘촘히)

  // Wave 순서대로 미활성 차량 정렬 (증분 진행)
  const orderedPending = (): { v: VehicleRecord; wave: string }[] => {
    const rec = store.get<EligibilityRuleRecord>("eligibilityRules", featureId);
    if (!rec) return [];
    const actSet = new Set(store.list<ActivationRecord>("activations").filter((a) => a.featureId === featureId).map((a) => a.vin));
    const vs = store.list<VehicleRecord>("vehicles");
    const out: { v: VehicleRecord; wave: string }[] = [];
    for (const w of rec.waveRules) {
      for (const v of vs) if (firstEligibleWave(v, rec.waveRules) === w.wave && !actSet.has(v.id)) out.push({ v, wave: w.wave });
    }
    return out;
  };

  const stopSim = () => { simRef.current = false; setSimRunning(false); if (timerRef.current) window.clearTimeout(timerRef.current); };

  const runStep = () => {
    if (!simRef.current || !featureId) return stopSim();
    const pend = orderedPending();
    if (!pend.length) { stopSim(); message.success("Rollout 시뮬레이션 완료 — 전 Wave 배포됨"); return; }
    const batch = pend.slice(0, BATCH);
    const lastWave = batch[batch.length - 1].wave;
    mutate(() => {
      const now = new Date().toISOString();
      batch.forEach(({ v, wave }, i) => {
        const fr = (fleetMeta?.waves.find((x) => x.wave === wave)?.failureRate ?? 2) + 4;
        const status: ActivationRecord["status"] = i % 100 < fr ? "FAILED" : "ACTIVATED";
        store.create<ActivationRecord>("activations", { id: `${featureId}::${v.id}`, featureId, vin: v.id, wave, status, at: now });
      });
    });
    const acts = store.list<ActivationRecord>("activations").filter((a) => a.featureId === featureId);
    setSimSeries((s) => [...s, { step: `${lastWave}·${s.length + 1}`, activated: acts.filter((a) => a.status === "ACTIVATED").length, failed: acts.filter((a) => a.status === "FAILED").length }]);
    timerRef.current = window.setTimeout(runStep, delayRef.current);
  };

  const startSim = () => { if (!applied) return; simRef.current = true; setSimRunning(true); runStep(); };

  const rewindSim = () => {
    stopSim();
    if (!featureId) return;
    mutate(() => {
      store.list<ActivationRecord>("activations").filter((a) => a.featureId === featureId).forEach((a) => store.remove("activations", a.id));
      store.audit({ actor: userName, action: "ROLLOUT_RESET", objectType: "Feature", objectId: featureId, after: "activations cleared", reason: "Rollout simulation rewind" });
    });
    setSimSeries([]);
    message.info("되감기 — 활성화 기록 초기화");
  };

  // ② 실패 VIN 재시도 (재시도 시 ~90% 성공)
  const retryFailed = (vins?: string[]) => {
    if (!feature) return;
    const targets = vins ? failedVins.filter((a) => vins.includes(a.vin)) : failedVins;
    if (!targets.length) return;
    mutate(() => {
      let ok = 0;
      targets.forEach((a, i) => {
        const next: ActivationRecord["status"] = i % 10 === 0 ? "FAILED" : "ACTIVATED";
        if (next === "ACTIVATED") ok += 1;
        store.update<ActivationRecord>("activations", a.id, { status: next });
      });
      store.audit({ actor: userName, action: "ACTIVATION_RETRY", objectType: "Feature", objectId: feature.id, after: `retried ${targets.length} VIN, ${ok} recovered` });
      message.success(`재시도 ${targets.length}대 — ${ok}대 복구`);
    });
  };

  // ② 실패 클러스터 → Field Issue 생성 + CAPA 개시 + (Critical 시) RG9 BLOCK
  const createFieldIssue = () => {
    if (!feature || !failedVins.length) return;
    const rc = failureReason(failedVins[0].vin);
    const critical = failedVins.length > 5;
    confirmDecision({
      title: "Field Issue 생성 (RCA)",
      content: `실패 ${failedVins.length}대 → Field Issue + CAPA를 생성합니다.${critical ? " Critical이므로 RG9 Operations Gate를 BLOCK합니다 (KPI-RULE-002)." : ""} Root Cause: ${rc}`,
      onOk: () =>
        mutate(() => {
          const capaId = `CAPA-${Date.now().toString().slice(-6)}`;
          const rg9 = store.get<Gate>("gates", `${feature.id}-RG9`);
          store.create<FieldIssueRecord>("fieldIssues", { id: "", featureId: feature.id, severity: critical ? "Critical" : "High", affectedVins: failedVins.length, rootCause: rc, status: "OPEN", capaId, rg9Before: rg9?.status, createdBy: userName, createdAt: new Date().toISOString() } as FieldIssueRecord);
          store.audit({ actor: userName, action: "FIELD_ISSUE_CREATED", objectType: "Feature", objectId: feature.id, after: `${failedVins.length} VIN failed · ${capaId}`, reason: rc });
          if (critical && rg9) {
            store.update<Gate>("gates", `${feature.id}-RG9`, { status: "BLOCK", blockingReason: `Field issue: ${rc}` });
            store.audit({ actor: "system", action: "RG9_BLOCK_FIELD_ISSUE", objectType: "Gate", objectId: `${feature.id}-RG9`, before: rg9.status, after: "BLOCK", reason: rc });
            const ns = derivedLifecycleStatus(store.list<Gate>("gates").filter((g) => g.featureId === feature.id));
            if (ns !== feature.status) store.update<Feature>("features", feature.id, { status: ns });
          }
          message.success(`Field Issue + ${capaId} 생성 — Field Operations(RG9) 연계`);
        }),
    });
  };

  const killSwitch = () => {
    if (!feature) return;
    confirmDecision({
      title: "🛑 Fleet-wide Kill Switch",
      danger: true,
      okText: "긴급 비활성화 실행",
      content: `${feature.name} 기능을 활성화된 시드 ${seedActive}대 차량에서 즉시 비활성화합니다. Safe Default로 전환되며 모든 실행이 Audit됩니다 (시트 64 RCP-007).`,
      onOk: () =>
        mutate(() => {
          featureActs.filter((a) => a.status === "ACTIVATED").forEach((a) => store.update<ActivationRecord>("activations", a.id, { status: "SAFE_DEFAULT" }));
          store.audit({ actor: userName, action: "FLEET_KILL_SWITCH", objectType: "Feature", objectId: feature.id, before: `${seedActive} active`, after: "Safe Default", reason: "Emergency disable across fleet" });
          message.error(`Kill Switch 실행됨 — ${seedActive}대 Safe Default 전환`);
        }),
    });
  };

  const waveColumns = [
    { title: "Wave", dataIndex: "wave" },
    { title: "Blast", dataIndex: "pct", render: (v: number) => `${v}%` },
    { title: "Cumulative", dataIndex: "target", render: (v: number) => <span className="fp-mono">{v.toLocaleString()}</span> },
    { title: "New (증분)", dataIndex: "incremental", render: (v: number) => <span className="fp-mono" style={{ color: "#0891b2", fontWeight: 600 }}>+{v.toLocaleString()}</span> },
    { title: "Est. Activated", dataIndex: "estActivated", render: (v: number, w: WaveRow) => (w.deployFraction > 0 ? <span className="fp-mono" style={{ color: "#15803d" }}>{v.toLocaleString()}</span> : "—") },
    { title: "Status", dataIndex: "status", render: (s: RolloutWave["status"]) => <Tag color={waveColor(s)}>{s}</Tag> },
    {
      title: "Deploy (시드 증분)",
      render: (_: unknown, w: WaveRow) => {
        const assigned = seedAssignCount(w.wave);
        const done = recsOfWave(w.wave).length;
        if (!applied) return <Tooltip title="Targeting Rule 적용 필요"><span style={{ color: "#94a3b8" }}>—</span></Tooltip>;
        return (
          <Space>
            <Tag color={done >= assigned && assigned > 0 ? "#15803d" : "#475569"}>{done}/{assigned}</Tag>
            <Button size="small" type="primary" disabled={!canDeploy || done >= assigned} onClick={() => deployWave(w)}>Deploy</Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fleet Control Tower"
        subtitle="수백만 대 차량 OTA/Policy 배포 통제 · VIN Eligibility → Wave 확산 → GO/HOLD/Rollback (시트 64)"
        icon="🛰"
        extra={
          <select
            value={featureId}
            onChange={(e) => setFeatureId(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "none", fontSize: 13 }}
          >
            {features.map((f) => (
              <option key={f.id} value={f.id}>{f.id} · {f.name}</option>
            ))}
          </select>
        }
      />
      <DataQualityBanner />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><StatTile icon="🚗" label="Fleet under Management" value={fmtVeh(FLEET_TOTALS.underManagement)} variant="chrome" delta="등록 차량 총수" /></Col>
        <Col xs={12} lg={6}><StatTile icon="⚡" label="Active Feature 차량" value={fmtVeh(FLEET_TOTALS.activeFeatures)} variant="cyan" delta="기능 활성 차량" /></Col>
        <Col xs={12} lg={6}><StatTile icon="📡" label="Telemetry Monitored" value={fmtVeh(FLEET_TOTALS.monitored)} variant="emerald" delta="98% coverage" /></Col>
        <Col xs={12} lg={6}><StatTile icon="🌍" label="Regions / Markets" value="42" variant="violet" delta="글로벌 배포" /></Col>
      </Row>

      {!feature || !fleetMeta ? null : (
        <>
          {killRecommended && (
            <Alert
              type="error"
              showIcon
              banner
              className="fp-pulse"
              style={{ marginBottom: 16, borderRadius: 12 }}
              message={`⚠ 자동 권고: 활성화 실패율 ${(failureRateNow * 100).toFixed(1)}% — KPI-OPS-002 Critical 임계(5%) 초과`}
              description="KPI-RULE-001/002에 따라 Wave HOLD 또는 Kill Switch / Policy Rollback 검토가 필요합니다. 실패 클러스터를 RCA하고 Field Issue로 연계하세요."
              action={
                <Space direction="vertical">
                  <Button danger type="primary" size="small" icon={<ThunderboltOutlined />} disabled={!canDeploy} onClick={killSwitch}>Kill Switch 실행</Button>
                  <Link to="/targeting"><Button size="small">Targeting 롤백</Button></Link>
                </Space>
              }
            />
          )}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={10}>
              <Card title={`VIN Eligibility Funnel · ${feature.id}`} className="fp-card-lift" style={{ height: "100%" }} extra={applied ? <Tag color="#15803d">Rule 적용됨</Tag> : <Tag color="#94a3b8">기본(전체)</Tag>}>
                <Space direction="vertical" style={{ width: "100%" }} size={14}>
                  <FunnelRow label="Registered Fleet" value={registered} max={registered} color="#1f4e78" />
                  <FunnelRow label={`Eligible VINs (${eligibilityPct}%)`} value={eligible} max={registered} color="#0891b2" />
                  <FunnelRow label={`Activated est. (${activationPct}% of eligible)`} value={estActivated} max={registered} color="#15803d" />
                  {estFailed > 0 && <FunnelRow label="Activation Failed est." value={estFailed} max={registered} color="#b45309" />}
                  <Alert
                    type={applied ? "success" : "info"}
                    showIcon
                    style={{ marginTop: 4 }}
                    message={applied ? `Targeting Rule 적용됨 — Eligible/Wave 대상수가 Rule 기준으로 계산됨 (by ${applied.appliedBy}).` : "Rule 미적용 — 전체 플릿이 대상. 조건별 통제를 적용하세요."}
                    action={<Link to="/targeting"><Tag color="#0891b2" style={{ cursor: "pointer" }}>조건별 통제 →</Tag></Link>}
                  />
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Rollout Wave (Blast Radius)" className="fp-card-lift" style={{ height: "100%" }}>
                <WaveBars data={waves.map((w) => ({ wave: w.wave, vehicles: w.target, color: waveColor(w.status) }))} />
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title="Fleet Activation" className="fp-card-lift" style={{ height: "100%" }}>
                <RadialProgress value={activationPct} color="#06b6d4" label={`${fmtVeh(estActivated)} 활성(추정)`} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card
                title="Rollout Waves — 증분 배포 / 시간축 시뮬레이션"
                className="fp-card-lift"
                extra={
                  applied ? (
                    <Space size={6}>
                      <Segmented size="small" value={simSpeed} onChange={(v) => setSimSpeed(v as typeof simSpeed)} options={["0.5x", "1x", "2x"]} />
                      {simRunning ? (
                        <>
                          <Tag color="#0891b2" className="fp-pulse" style={{ margin: 0 }}>▶ 진행 중</Tag>
                          <Button size="small" icon={<PauseOutlined />} onClick={stopSim}>일시정지</Button>
                        </>
                      ) : (
                        <Button size="small" type="primary" icon={<PlayCircleOutlined />} disabled={!canDeploy} onClick={startSim}>{featureActs.length ? "재개" : "시뮬레이션"}</Button>
                      )}
                      <Button size="small" icon={<ReloadOutlined />} disabled={!canDeploy || (!featureActs.length && !simSeries.length)} onClick={rewindSim}>되감기</Button>
                    </Space>
                  ) : (
                    <Tooltip title="Targeting Rule 적용 필요"><span style={{ fontSize: 12, color: "#94a3b8" }}>Rule 미적용</span></Tooltip>
                  )
                }
              >
                <Table<WaveRow> rowKey="wave" dataSource={waves} columns={waveColumns} pagination={false} size="small" />
                {(simRunning || featureActs.length > 0) && <Progress percent={seedTotalAssigned ? Math.round((featureActs.length / seedTotalAssigned) * 100) : 0} status={simRunning ? "active" : "normal"} strokeColor="#06b6d4" style={{ marginTop: 10 }} format={(p) => `${featureActs.length}/${seedTotalAssigned} (${p}%)`} />}
                {simSeries.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>📈 Live Activation Telemetry (시드 기준 실시간 추세)</div>
                    <KpiMultiLine
                      data={simSeries}
                      xKey="step"
                      series={[
                        { key: "activated", color: "#15803d", name: "Activated" },
                        { key: "failed", color: "#b45309", name: "Failed" },
                      ]}
                      height={200}
                    />
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Emergency Fleet Control" className="fp-card-lift" style={{ marginBottom: 16 }}>
                <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Kill Switch는 Rollback보다 빠른 운영 통제 수단 (UI-026)." />
                <Button danger type="primary" block icon={<ThunderboltOutlined />} disabled={!canDeploy || seedActive === 0} onClick={killSwitch}>
                  Fleet-wide Kill Switch ({seedActive}대 활성)
                </Button>
                {!canDeploy && <div style={{ fontSize: 12, color: "#9a3412", marginTop: 8 }}>Release Owner 권한 필요</div>}
              </Card>

              {/* ③ 시드 차량(420) VIN별 실제 활성화 추적 */}
              <Card title={`Sample Fleet Activation (시드 ${vehicles.length}대)`} size="small" className="fp-card-lift" style={{ marginBottom: 16 }}>
                {!applied ? (
                  <Alert type="info" showIcon message="Targeting Rule 적용 후 Wave를 Deploy하면 VIN별 활성화가 추적됩니다." />
                ) : (
                  <>
                    <Row gutter={8} style={{ marginBottom: 10 }}>
                      <Col span={8}><div style={{ textAlign: "center" }}><div className="fp-display" style={{ fontSize: 22, fontWeight: 700, color: "#15803d" }}>{seedActive}</div><div style={{ fontSize: 11, color: "#64748b" }}>ACTIVATED</div></div></Col>
                      <Col span={8}><div style={{ textAlign: "center" }}><div className="fp-display" style={{ fontSize: 22, fontWeight: 700, color: "#b45309" }}>{seedFailed}</div><div style={{ fontSize: 11, color: "#64748b" }}>FAILED</div></div></Col>
                      <Col span={8}><div style={{ textAlign: "center" }}><div className="fp-display" style={{ fontSize: 22, fontWeight: 700, color: "#475569" }}>{seedSafe}</div><div style={{ fontSize: 11, color: "#64748b" }}>SAFE_DEFAULT</div></div></Col>
                    </Row>
                    <Progress percent={seedTotalAssigned ? Math.round((featureActs.length / seedTotalAssigned) * 100) : 0} strokeColor="#06b6d4" size="small" format={() => `${featureActs.length}/${seedTotalAssigned} 배포`} />
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Wave를 순차 Deploy하면 신규 차량만 증분 활성화됩니다 (중복 제거).</div>
                  </>
                )}
              </Card>

              {/* ② 실패 VIN 재시도 / RCA → Field Issue */}
              {applied && (seedFailed > 0 || fieldIssues.length > 0) && (
                <Card title={`Failed Activation RCA (${seedFailed})`} size="small" className="fp-card-lift" style={{ marginBottom: 16 }}>
                  {seedFailed > 0 ? (
                    <>
                      <Alert type="error" showIcon style={{ marginBottom: 10 }} message={`${seedFailed}대 활성화 실패 — 추정 사유: ${failureReason(failedVins[0].vin)}`} />
                      <Table
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 4 }}
                        dataSource={failedVins}
                        columns={[
                          { title: "VIN", dataIndex: "vin", render: (v: string) => <span className="fp-mono">{v}</span> },
                          { title: "Wave", dataIndex: "wave" },
                          { title: "Reason", render: (_: unknown, a: ActivationRecord) => <span style={{ fontSize: 12, color: "#9a3412" }}>{failureReason(a.vin)}</span> },
                          { title: "", render: (_: unknown, a: ActivationRecord) => <Button size="small" disabled={!canDeploy} onClick={() => retryFailed([a.vin])}>재시도</Button> },
                        ]}
                      />
                      <Space style={{ marginTop: 10 }}>
                        <Button type="primary" disabled={!canDeploy} onClick={() => retryFailed()}>전체 재시도 ({seedFailed})</Button>
                        <Button danger disabled={!canDeploy} onClick={createFieldIssue}>Field Issue 생성 (RCA)</Button>
                      </Space>
                    </>
                  ) : (
                    <Alert type="success" showIcon message="활성화 실패 없음 (재시도 완료)" />
                  )}
                  {fieldIssues.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {fieldIssues.map((fi) => (
                        <div key={fi.id} style={{ fontSize: 12, padding: "4px 0", borderTop: "1px solid #eef2f8" }}>
                          <Tag color={fi.severity === "Critical" ? "#b91c1c" : "#b45309"}>{fi.severity}</Tag>
                          <span className="fp-mono">{fi.id}</span> · {fi.affectedVins}대 · {fi.rootCause} <Tag color="#475569">{fi.status}</Tag>
                          <Link to="/field" style={{ marginLeft: 6 }}>Field Ops →</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              <Card title="Rollout Control Playbook (시트 64)" size="small" className="fp-card-lift">
                {PLAYBOOK.map((p) => (
                  <div key={p.id} style={{ marginBottom: 8 }}>
                    <Tag className="fp-mono" color="#1f4e78">{p.id}</Tag>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.phase}</span>
                    <div style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>{p.check}</div>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

function FunnelRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
        <span className="fp-mono" style={{ fontWeight: 700, color: "#0a1f44" }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height: 26, borderRadius: 8, background: "#eef2f8", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 8, transition: "width 0.8s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, color: "#fff", fontSize: 11, fontWeight: 600 }}>
          {pct.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
