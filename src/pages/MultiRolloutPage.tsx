// 멀티 Feature 동시 롤아웃 보드 — 여러 Feature의 플릿 배포를 한 화면에서 동시 모니터링/시뮬레이션.
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Drawer, Progress, Row, Segmented, Space, Table, Tag, Tooltip, message } from "antd";
import { DownloadOutlined, PauseOutlined, PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { store, useList, useMutate } from "../data/useStore";
import type { Feature, Gate } from "../domain/types";
import { computeGateSummary } from "../domain/gateLogic";
import { FLEET, waveColor } from "../data/fleet";
import { REGION_IDS, TRIM_IDS, firstEligibleWave, fmtVeh, type ActivationRecord, type EligibilityRuleRecord, type VehicleRecord } from "../data/population";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { StatTile } from "../components/viz/StatTile";
import { RadialGauge } from "../components/viz/Charts";
import { KpiMultiLine, StackedBars } from "../components/viz/RCharts";
import { DecisionBadge, LifecycleBadge } from "../components/StatusBadge";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

const LINE_COLORS = ["#06b6d4", "#7c83f7", "#34d399", "#f59e0b", "#f43f5e"];
const BATCH = 24;

export function MultiRolloutPage() {
  const features = useList<Feature>("features").filter((f) => FLEET[f.id]);
  const gates = useList<Gate>("gates");
  const activations = useList<ActivationRecord>("activations");
  const vehicles = useList<VehicleRecord>("vehicles");
  const rules = useList<EligibilityRuleRecord>("eligibilityRules");
  const mutate = useMutate();
  const { role } = useRole();
  const canDeploy = can(role, "release.approve");

  const ruleOf = (id: string) => rules.find((r) => r.id === id);
  const actsOf = (id: string) => activations.filter((a) => a.featureId === id);

  // Feature별 롤아웃 상태 집계
  const board = features.map((f, idx) => {
    const applied = ruleOf(f.id);
    const acts = actsOf(f.id);
    const activated = acts.filter((a) => a.status === "ACTIVATED").length;
    const failed = acts.filter((a) => a.status === "FAILED").length;
    const safe = acts.filter((a) => a.status === "SAFE_DEFAULT").length;
    const deployed = activated + failed;
    const seedAssigned = applied ? vehicles.filter((v) => firstEligibleWave(v, applied.waveRules)).length : 0;
    const eligible = applied ? applied.waveRules[applied.waveRules.length - 1]?.eligible ?? 0 : FLEET[f.id]?.eligibleVins ?? 0;
    const failRate = deployed ? failed / deployed : 0;
    const progress = seedAssigned ? Math.round(((activated + failed + safe) / seedAssigned) * 100) : 0;
    const summary = computeGateSummary(gates.filter((g) => g.featureId === f.id));
    const color = LINE_COLORS[idx % LINE_COLORS.length];
    return { f, applied, eligible, activated, failed, safe, deployed, seedAssigned, failRate, progress, summary, color };
  });

  const totalEligible = board.reduce((s, b) => s + b.eligible, 0);
  const totalActivated = board.reduce((s, b) => s + b.activated, 0);
  const totalFailed = board.reduce((s, b) => s + b.failed, 0);
  const goCount = board.filter((b) => b.summary.decision === "GO").length;
  const breaching = board.filter((b) => b.deployed >= 10 && b.failRate >= 0.05);

  const appliedIds = features.filter((f) => ruleOf(f.id)).map((f) => f.id);

  // ── 시뮬레이션 (① Feature별 개별 + 전체) ──
  const [series, setSeries] = useState<Record<string, number | string>[]>([]);
  const [speed, setSpeed] = useState<"0.5x" | "1x" | "2x">("1x");
  const [autoIds, setAutoIds] = useState<string[]>([]); // 개별 auto-run 중인 Feature
  const autoRef = useRef<Set<string>>(new Set());
  const loopRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const delayRef = useRef(900);
  useEffect(() => { delayRef.current = speed === "0.5x" ? 1700 : speed === "2x" ? 420 : 900; }, [speed]);
  useEffect(() => () => { autoRef.current.clear(); loopRef.current = false; if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const pendingFor = (id: string, rec: EligibilityRuleRecord) => {
    const actSet = new Set(store.list<ActivationRecord>("activations").filter((a) => a.featureId === id).map((a) => a.vin));
    const vs = store.list<VehicleRecord>("vehicles");
    const out: { v: VehicleRecord; wave: string }[] = [];
    for (const w of rec.waveRules) for (const v of vs) if (firstEligibleWave(v, rec.waveRules) === w.wave && !actSet.has(v.id)) out.push({ v, wave: w.wave });
    return out;
  };

  const deployBatch = (id: string): number => {
    const rec = store.get<EligibilityRuleRecord>("eligibilityRules", id);
    if (!rec) return 0;
    const batch = pendingFor(id, rec).slice(0, BATCH);
    if (!batch.length) return 0;
    mutate(() => {
      const now = new Date().toISOString();
      batch.forEach(({ v, wave }, i) => {
        const fr = (FLEET[id]?.waves.find((x) => x.wave === wave)?.failureRate ?? 2) + 4;
        const status: ActivationRecord["status"] = i % 100 < fr ? "FAILED" : "ACTIVATED";
        store.create<ActivationRecord>("activations", { id: `${id}::${v.id}`, featureId: id, vin: v.id, wave, status, at: now });
      });
    });
    return batch.length;
  };

  const appendSeries = () => {
    const pt: Record<string, number | string> = { t: `t${series.length + 1}` };
    appliedIds.forEach((id) => { pt[id] = store.list<ActivationRecord>("activations").filter((a) => a.featureId === id && a.status === "ACTIVATED").length; });
    setSeries((s) => [...s, pt]);
  };

  const tick = () => {
    if (!autoRef.current.size) { loopRef.current = false; return; }
    const finished: string[] = [];
    autoRef.current.forEach((id) => { if (deployBatch(id) === 0) finished.push(id); });
    if (finished.length) { finished.forEach((id) => autoRef.current.delete(id)); setAutoIds(Array.from(autoRef.current)); }
    appendSeries();
    if (autoRef.current.size) timerRef.current = window.setTimeout(tick, delayRef.current);
    else loopRef.current = false;
  };

  const ensureLoop = () => { if (!loopRef.current && autoRef.current.size) { loopRef.current = true; timerRef.current = window.setTimeout(tick, delayRef.current); } };

  const toggleFeature = (id: string) => {
    if (autoRef.current.has(id)) autoRef.current.delete(id);
    else autoRef.current.add(id);
    setAutoIds(Array.from(autoRef.current));
    ensureLoop();
  };

  const startAll = () => { appliedIds.forEach((id) => autoRef.current.add(id)); setAutoIds(Array.from(autoRef.current)); ensureLoop(); };
  const pauseAll = () => { autoRef.current.clear(); setAutoIds([]); loopRef.current = false; if (timerRef.current) window.clearTimeout(timerRef.current); };
  const deployOnce = (id: string) => { const n = deployBatch(id); if (n) appendSeries(); };

  const rewindAll = () => {
    pauseAll();
    mutate(() => {
      features.forEach((f) => store.list<ActivationRecord>("activations").filter((a) => a.featureId === f.id).forEach((a) => store.remove("activations", a.id)));
      store.audit({ actor: "system", action: "ROLLOUT_RESET_ALL", objectType: "Fleet", objectId: "ALL", after: "all activations cleared", reason: "Multi-rollout rewind" });
    });
    setSeries([]);
  };
  const running = autoIds.length > 0;

  // ② 지역/트림 차원 교차 집계 (활성화 차량을 Feature별로 stack)
  const vmap = new Map(vehicles.map((v) => [v.id, v]));
  const activatedActs = activations.filter((a) => a.status === "ACTIVATED");
  const featureColor = (id: string) => LINE_COLORS[features.findIndex((f) => f.id === id) % LINE_COLORS.length];
  const stackKeys = appliedIds.map((id) => ({ key: id, color: featureColor(id), name: id }));
  const regionData = REGION_IDS.map((region) => {
    const row: Record<string, string | number> = { region };
    appliedIds.forEach((id) => (row[id] = activatedActs.filter((a) => a.featureId === id && vmap.get(a.vin)?.region === region).length));
    return row;
  });
  const trimData = TRIM_IDS.map((trim) => {
    const row: Record<string, string | number> = { trim };
    appliedIds.forEach((id) => (row[id] = activatedActs.filter((a) => a.featureId === id && vmap.get(a.vin)?.trim === trim).length));
    return row;
  });
  const hasActivations = activatedActs.length > 0;

  // ③ Gantt — 실제 시간축: Wave duration = ceil(assigned/BATCH) ticks, 폭 ∝ 시간, ETA 계산
  const tickSec = delayRef.current / 1000;
  const gantt = board
    .filter((b) => b.applied)
    .map((b) => {
      const wr = b.applied!.waveRules;
      let totalTicks = 0;
      let remainingTicks = 0;
      const segs = wr.map((w, i) => {
        const meta = FLEET[b.f.id]?.waves[i];
        const assigned = vehicles.filter((v) => firstEligibleWave(v, wr) === w.wave).length;
        const done = actsOf(b.f.id).filter((a) => a.wave === w.wave).length;
        const ticks = Math.max(1, Math.ceil(assigned / BATCH));
        totalTicks += ticks;
        remainingTicks += Math.max(0, Math.ceil((assigned - done) / BATCH));
        return { wave: w.wave, ticks, fillPct: assigned ? (done / assigned) * 100 : 0, color: meta ? waveColor(meta.status) : "#94a3b8", done, assigned };
      });
      return { id: b.f.id, name: b.f.name, segs, totalTicks, remainingTicks, etaSec: remainingTicks * tickSec, done: remainingTicks === 0 };
    });
  const maxTicks = Math.max(1, ...gantt.map((g) => g.totalTicks));
  const axisMarks = Array.from({ length: Math.min(maxTicks, 8) + 1 }, (_, i) => Math.round((i / Math.min(maxTicks, 8)) * maxTicks));

  // ② 셀(Feature×지역/트림) 클릭 시 VIN 드릴다운
  const [drill, setDrill] = useState<{ featureId: string; dim: "region" | "trim"; value: string } | null>(null);
  const drillRows = drill
    ? activatedActs
        .filter((a) => a.featureId === drill.featureId)
        .map((a) => ({ ...a, vehicle: vmap.get(a.vin) }))
        .filter((a) => a.vehicle && a.vehicle[drill.dim] === drill.value)
    : [];

  // ③ 보드 상태 CSV Export
  const exportCsv = () => {
    const header = ["FeatureID", "Name", "Lifecycle", "ProductionDecision", "RuleVersion", "Eligible", "Activated", "Failed", "SafeDefault", "FailureRate%", "Progress%", ...FLEET[board[0]?.f.id ?? ""]?.waves.map((w) => `${w.wave}(done/assigned)`) ?? []];
    const lines = board.map((b) => {
      const waveCols = b.applied ? (FLEET[b.f.id]?.waves ?? []).map((w) => { const assigned = vehicles.filter((v) => firstEligibleWave(v, b.applied!.waveRules) === w.wave).length; const done = actsOf(b.f.id).filter((a) => a.wave === w.wave).length; return `${done}/${assigned}`; }) : [];
      return [b.f.id, `"${b.f.name}"`, b.f.status, b.summary.decision, b.applied?.version ?? "-", b.eligible, b.activated, b.failed, b.safe, (b.failRate * 100).toFixed(1), b.progress, ...waveCols].join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rollout-board.csv";
    a.click();
    URL.revokeObjectURL(url);
    message.success(`보드 상태 CSV Export (${board.length} features)`);
  };

  return (
    <div>
      <PageHeader
        title="Multi-Feature Rollout Board"
        subtitle="여러 Feature의 플릿 롤아웃을 동시에 모니터링·시뮬레이션 (동시 배포 관제)"
        icon="🛫"
        extra={
          <Space size={6}>
            <Segmented size="small" value={speed} onChange={(v) => setSpeed(v as typeof speed)} options={["0.5x", "1x", "2x"]} />
            {running ? (
              <Button size="small" icon={<PauseOutlined />} onClick={pauseAll}>전체 일시정지</Button>
            ) : (
              <Tooltip title={appliedIds.length ? "" : "적용된 Targeting Rule이 있는 Feature가 없습니다"}>
                <Button size="small" type="primary" icon={<PlayCircleOutlined />} disabled={!canDeploy || !appliedIds.length} onClick={startAll}>전체 동시 롤아웃 ▶</Button>
              </Tooltip>
            )}
            <Button size="small" icon={<ReloadOutlined />} disabled={!canDeploy} onClick={rewindAll}>전체 되감기</Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>CSV</Button>
          </Space>
        }
      />
      <DataQualityBanner />

      {breaching.length > 0 && (
        <Alert type="error" showIcon banner className="fp-pulse" style={{ marginBottom: 16, borderRadius: 12 }} message={`⚠ ${breaching.length}개 Feature 실패율 임계 초과 — ${breaching.map((b) => b.f.id).join(", ")} (KPI-RULE-002, Kill Switch/Rollback 검토)`} action={<Link to="/fleet"><Button size="small">Fleet Control</Button></Link>} />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><StatTile icon="🛫" label="동시 롤아웃 Feature" value={appliedIds.length} variant="chrome" delta={`${features.length}개 중 Rule 적용`} /></Col>
        <Col xs={12} lg={6}><StatTile icon="🎯" label="총 대상 (Eligible)" value={fmtVeh(totalEligible)} variant="cyan" delta="합산 모집단" /></Col>
        <Col xs={12} lg={6}><StatTile icon="✅" label="활성화(시드)" value={totalActivated} variant="emerald" delta={`실패 ${totalFailed}`} /></Col>
        <Col xs={12} lg={6}><StatTile icon="🚦" label="Production GO" value={goCount} variant="violet" delta={`${features.length}개 Feature`} /></Col>
      </Row>

      {series.length > 0 && (
        <Card title="동시 활성화 추세 (Feature별, 시드 기준 실시간)" className="fp-card-lift" style={{ marginBottom: 16 }}>
          <KpiMultiLine data={series} xKey="t" series={stackKeys} height={240} />
        </Card>
      )}

      {/* ③ Wave 타임라인 Gantt (실제 시간축 + ETA) */}
      {gantt.length > 0 && (
        <Card title={`Wave Rollout Timeline (Gantt) — 시간축 기준 일정 · ${speed} 배속 (틱 ${tickSec}s)`} className="fp-card-lift" style={{ marginBottom: 16 }}>
          {/* 시간축 눈금 */}
          <div style={{ display: "flex", marginBottom: 6, paddingLeft: 196, paddingRight: 8 }}>
            <div style={{ flex: 1, position: "relative", height: 16 }}>
              {axisMarks.map((m, i) => (
                <span key={i} style={{ position: "absolute", left: `${(m / maxTicks) * 100}%`, transform: "translateX(-50%)", fontSize: 10, color: "#94a3b8" }}>+{Math.round(m * tickSec)}s</span>
              ))}
            </div>
          </div>
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            {gantt.map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 186, flexShrink: 0 }}>
                  <Link to={`/features/${g.id}`} className="fp-mono" style={{ fontSize: 12, fontWeight: 600 }}>{g.id}</Link>
                  <div style={{ fontSize: 10, color: g.done ? "#15803d" : "#b45309" }}>{g.done ? "✓ 완료" : `ETA +${Math.round(g.etaSec)}s (${g.remainingTicks} ticks)`}</div>
                </div>
                <div style={{ flex: 1, display: "flex", gap: 2, height: 30, width: `${(g.totalTicks / maxTicks) * 100}%` }}>
                  {g.segs.map((s) => (
                    <Tooltip key={s.wave} title={`${s.wave} · ${s.ticks} ticks (~${Math.round(s.ticks * tickSec)}s) · 배포 ${s.done}/${s.assigned}`}>
                      <div style={{ flex: s.ticks, minWidth: 22, background: `${s.color}22`, border: `1px solid ${s.color}66`, borderRadius: 6, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${s.fillPct}%`, background: s.color, opacity: 0.55, transition: "width 0.4s ease" }} />
                        <span style={{ position: "relative", fontSize: 9, color: "#0a1f44", fontWeight: 600 }}>{s.wave.replace("Wave ", "").replace("Pilot ", "P")}</span>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </Space>
          <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>ⓘ 세그먼트 폭 = 예상 소요 시간(틱), 채움 = 배포율. ETA는 현재 배속·잔여 차량 기준 추정. 배속을 바꾸면 시간축이 재계산됩니다.</div>
        </Card>
      )}

      {/* ② 지역/트림 차원 교차 집계 */}
      {hasActivations && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="지역(Region)별 활성화 — Feature 교차 집계 (막대 클릭 → VIN)" className="fp-card-lift">
              <StackedBars data={regionData} xKey="region" keys={stackKeys} height={240} onBarClick={(key, p) => setDrill({ featureId: key, dim: "region", value: String(p.region) })} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="트림(Trim)별 활성화 — Feature 교차 집계 (막대 클릭 → VIN)" className="fp-card-lift">
              <StackedBars data={trimData} xKey="trim" keys={stackKeys} height={240} onBarClick={(key, p) => setDrill({ featureId: key, dim: "trim", value: String(p.trim) })} />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {board.map((b) => (
          <Col key={b.f.id} xs={24} md={12} xl={8}>
            <Card className="fp-card-lift" style={{ height: "100%", borderTop: `3px solid ${b.color}` }}>
              <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 8 }}>
                <Link to={`/features/${b.f.id}`} className="fp-mono" style={{ fontWeight: 700 }}>{b.f.id}</Link>
                <DecisionBadge decision={b.summary.decision} />
              </Space>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{b.f.name}</div>
              <Space style={{ marginBottom: 10 }}><LifecycleBadge status={b.f.status} />{b.applied ? <Tag color="#15803d">Rule v{b.applied.version}</Tag> : <Tag color="#94a3b8">미적용</Tag>}{b.failRate >= 0.05 && b.deployed >= 10 && <Tag color="#b91c1c">실패율 {(b.failRate * 100).toFixed(0)}%</Tag>}</Space>

              <Row gutter={12} align="middle">
                <Col flex="none"><RadialGauge value={b.progress} size={92} stroke={9} sublabel="배포율" color={b.color} /></Col>
                <Col flex="auto">
                  <div style={{ fontSize: 12, color: "#64748b" }}>Eligible</div>
                  <div className="fp-mono" style={{ fontSize: 18, fontWeight: 700, color: "#0a1f44" }}>{fmtVeh(b.eligible)}</div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    <Tag color="#15803d" style={{ marginInline: 0 }}>활성 {b.activated}</Tag>{" "}
                    <Tag color="#b45309" style={{ marginInline: 0 }}>실패 {b.failed}</Tag>{" "}
                    {b.safe > 0 && <Tag color="#475569" style={{ marginInline: 0 }}>Safe {b.safe}</Tag>}
                  </div>
                </Col>
              </Row>

              {/* Wave별 진행 미니바 */}
              {b.applied && (
                <div style={{ marginTop: 10 }}>
                  {FLEET[b.f.id]?.waves.map((w) => {
                    const assigned = vehicles.filter((v) => firstEligibleWave(v, b.applied!.waveRules) === w.wave).length;
                    const done = actsOf(b.f.id).filter((a) => a.wave === w.wave).length;
                    const pct = assigned ? Math.round((done / assigned) * 100) : 0;
                    return (
                      <div key={w.wave} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: "#64748b", width: 64 }}>{w.wave}</span>
                        <Progress percent={pct} size="small" strokeColor={waveColor(w.status)} style={{ flex: 1, margin: 0 }} format={() => `${done}/${assigned}`} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ① Feature별 개별 제어 */}
              <Space style={{ marginTop: 10, width: "100%" }} size={6}>
                {b.applied ? (
                  <>
                    {autoIds.includes(b.f.id) ? (
                      <Button size="small" icon={<PauseOutlined />} onClick={() => toggleFeature(b.f.id)}>일시정지</Button>
                    ) : (
                      <Button size="small" type="primary" icon={<PlayCircleOutlined />} disabled={!canDeploy} onClick={() => toggleFeature(b.f.id)}>▶ Auto</Button>
                    )}
                    <Button size="small" disabled={!canDeploy} onClick={() => deployOnce(b.f.id)}>+1 배치</Button>
                  </>
                ) : (
                  <Link to="/targeting"><Button size="small">Rule 적용 →</Button></Link>
                )}
                <Link to="/fleet"><Button size="small" type="text">Fleet →</Button></Link>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ② VIN 드릴다운 Drawer */}
      <Drawer
        title={drill ? <span><Tag className="fp-mono" color="#1f4e78">{drill.featureId}</Tag>{drill.dim === "region" ? "지역" : "트림"} = {drill.value} 활성 VIN ({drillRows.length})</span> : ""}
        width={560}
        open={!!drill}
        onClose={() => setDrill(null)}
      >
        {drill && (
          <Table
            rowKey="vin"
            size="small"
            dataSource={drillRows}
            pagination={{ pageSize: 12 }}
            columns={[
              { title: "VIN", dataIndex: "vin", render: (v: string) => <span className="fp-mono">{v}</span> },
              { title: "Region", render: (_: unknown, r: (typeof drillRows)[number]) => r.vehicle?.region },
              { title: "Trim", render: (_: unknown, r: (typeof drillRows)[number]) => r.vehicle?.trim },
              { title: "Wave", dataIndex: "wave" },
              { title: "HW", render: (_: unknown, r: (typeof drillRows)[number]) => r.vehicle?.hw },
              { title: "Status", dataIndex: "status", render: (v: string) => <Tag color="#15803d">{v}</Tag> },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
