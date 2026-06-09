// UI-017/018/024 Feature Targeting — region/trim/HW/SW/option/VIN 조건별 통제.
// Wave별 점진 확대 Rule + 적용 시 Policy Rule(UI-024) 생성 & RG3 Variant Gate 반영.
import { useEffect, useMemo, useState } from "react";
import { Alert, AutoComplete, Button, Card, Col, Divider, Drawer, Row, Segmented, Select, Space, Switch, Table, Tag, Timeline, message } from "antd";
import { AimOutlined, HistoryOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { store, useList, useMutate, useOne } from "../data/useStore";
import type { Feature, Gate } from "../domain/types";
import { derivedLifecycleStatus } from "../domain/gateLogic";
import {
  DEFAULT_WAVES,
  EMPTY_RULE,
  HW_VERSIONS,
  OPTION_CODES,
  REGION_IDS,
  TRIM_IDS,
  checkVehicle,
  evaluateFleet,
  fmtVeh,
  progressivePreset,
  ruleToPolicyExpression,
  type ActivationRecord,
  type EligibilityRule,
  type EligibilityRuleRecord,
  type EligibilityVersionRecord,
  type VehicleRecord,
  type WaveRule,
} from "../data/population";
import { FLEET } from "../data/fleet";
import { DataQualityBanner, PageHeader, confirmDecision } from "../components/Common";
import { RadialGauge, BarRow } from "../components/viz/Charts";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

function heatColor(ratio: number): string {
  if (ratio <= 0) return "#f1f5f9";
  return `rgba(6, 182, 212, ${(0.12 + ratio * 0.78).toFixed(2)})`;
}

export function TargetingPage() {
  const features = useList<Feature>("features");
  const vehicles = useList<VehicleRecord>("vehicles");
  const mutate = useMutate();
  const { role, userName } = useRole();
  const canApply = can(role, "release.approve") || can(role, "registry.edit");

  const [featureId, setFeatureId] = useState<string | undefined>(features[0]?.id);
  const applied = useOne<EligibilityRuleRecord>("eligibilityRules", featureId);
  const waveNames = useMemo(() => FLEET[featureId ?? ""]?.waves.map((w) => w.wave) ?? DEFAULT_WAVES, [featureId]);

  const history = useList<EligibilityVersionRecord>("eligibilityHistory").filter((h) => h.featureId === featureId).sort((a, b) => b.version - a.version);
  const actByVin = new Map(useList<ActivationRecord>("activations").filter((a) => a.featureId === featureId).map((a) => [a.vin, a]));
  const [waveRules, setWaveRules] = useState<Record<string, EligibilityRule>>({});
  const [selectedWave, setSelectedWave] = useState(waveNames[0]);
  const [vinQuery, setVinQuery] = useState("");
  const [checkedVin, setCheckedVin] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Feature 전환 시 적용된 Wave Rule 로드
  useEffect(() => {
    const init: Record<string, EligibilityRule> = {};
    waveNames.forEach((w) => {
      init[w] = applied?.waveRules.find((wr) => wr.wave === w)?.rule ?? EMPTY_RULE;
    });
    setWaveRules(init);
    setSelectedWave(waveNames[0]);
    setCheckedVin(null);
  }, [featureId, applied, waveNames]);

  const rule = waveRules[selectedWave] ?? EMPTY_RULE;
  const setRule = (next: EligibilityRule) => setWaveRules((m) => ({ ...m, [selectedWave]: next }));
  const result = useMemo(() => evaluateFleet(rule), [rule]);
  const maxCell = useMemo(() => Math.max(...result.matrix.map((m) => m.count), 1), [result]);

  // Wave별 eligible (점진 확대 시각화)
  const waveEligibles = waveNames.map((w) => ({ wave: w, eligible: evaluateFleet(waveRules[w] ?? EMPTY_RULE).eligible }));
  const maxWaveElig = Math.max(...waveEligibles.map((w) => w.eligible), 1);
  const nonMonotonic = waveEligibles.some((w, i) => i > 0 && w.eligible < waveEligibles[i - 1].eligible);

  const checkedVehicle = checkedVin ? vehicles.find((v) => v.id === checkedVin) : undefined;
  const vinResult = checkedVehicle ? checkVehicle(checkedVehicle, rule) : null;
  const policyExpr = ruleToPolicyExpression(rule);

  const applyPreset = () => {
    const preset = progressivePreset();
    const next: Record<string, EligibilityRule> = {};
    waveNames.forEach((w, i) => (next[w] = preset[Math.min(i, preset.length - 1)]));
    setWaveRules(next);
    message.info("점진 확대 프리셋 적용 — Pilot(좁음) → Wave 100%(전체)로 단계 확대");
  };

  const applyRule = () => {
    if (!featureId) return;
    const feature = features.find((f) => f.id === featureId)!;
    const finalElig = waveEligibles[waveEligibles.length - 1].eligible;
    confirmDecision({
      title: "Eligibility Rule 적용 + RG3 반영",
      content: `${featureId}: Wave별 Rule을 확정하고, 생성된 Policy(UI-024)를 RG3 Variant Gate 근거로 반영합니다. 최종 대상 ${finalElig.toLocaleString()} 대.`,
      onOk: () =>
        mutate(() => {
          const waveRulesArr: WaveRule[] = waveNames.map((w) => ({ wave: w, rule: waveRules[w] ?? EMPTY_RULE, eligible: evaluateFleet(waveRules[w] ?? EMPTY_RULE).eligible }));
          const version = (applied?.version ?? 0) + 1;
          // ② 이전 버전을 이력에 보관
          if (applied) store.create<EligibilityVersionRecord>("eligibilityHistory", { id: `${featureId}-v${applied.version}`, featureId, version: applied.version, waveRules: applied.waveRules, appliedBy: applied.appliedBy, appliedAt: applied.appliedAt });
          // ① RG3 Variant Gate에 반영 (Variant/Eligibility Rule = RG3 근거)
          const rg3Id = `${featureId}-RG3`;
          const rg3 = store.get<Gate>("gates", rg3Id);
          // ③ 최초 적용 전 RG3 상태 보존 (전체 롤백 시 복원)
          const rg3Before = applied?.rg3Before ?? rg3?.status ?? "NOT_STARTED";
          const rec: EligibilityRuleRecord = { id: featureId, version, waveRules: waveRulesArr, rg3Before, appliedBy: userName, appliedAt: new Date().toISOString() };
          if (applied) store.update("eligibilityRules", featureId, rec);
          else store.create("eligibilityRules", rec);

          if (rg3) {
            store.update<Gate>("gates", rg3Id, { status: "PASS", evidenceCount: Math.max(rg3.evidenceCount, 1), approver: userName, approvalDate: new Date().toISOString(), blockingReason: undefined });
            store.audit({ actor: userName, action: "RG3_VARIANT_RULE_APPLIED", objectType: "Gate", objectId: rg3Id, before: rg3.status, after: "PASS", reason: `Targeting rule applied: ${ruleToPolicyExpression(waveRulesArr[waveRulesArr.length - 1].rule)}` });
            const fresh = store.list<Gate>("gates").filter((g) => g.featureId === featureId);
            const ns = derivedLifecycleStatus(fresh);
            if (ns !== feature.status) {
              store.update<Feature>("features", featureId, { status: ns, updatedAt: new Date().toISOString() });
              store.audit({ actor: "system", action: "LIFECYCLE_TRANSITION", objectType: "Feature", objectId: featureId, before: feature.status, after: ns, reason: "RG3 satisfied via targeting" });
            }
          }
          store.audit({ actor: userName, action: "ELIGIBILITY_RULE_APPLIED", objectType: "Feature", objectId: featureId, after: `${finalElig} eligible (final wave)`, reason: "Per-wave targeting applied to fleet" });
          message.success(`적용 완료 — Wave별 Rule + RG3 PASS + Fleet 반영`);
        }),
    });
  };

  const rollback = (ver: EligibilityVersionRecord) => {
    if (!featureId) return;
    confirmDecision({
      title: `버전 v${ver.version}로 롤백`,
      content: `현재 적용된 Rule을 v${ver.version} (by ${ver.appliedBy}) 시점으로 되돌립니다. 새 버전으로 기록됩니다.`,
      onOk: () =>
        mutate(() => {
          const newVersion = (applied?.version ?? ver.version) + 1;
          if (applied) store.create<EligibilityVersionRecord>("eligibilityHistory", { id: `${featureId}-v${applied.version}-r`, featureId, version: applied.version, waveRules: applied.waveRules, appliedBy: applied.appliedBy, appliedAt: applied.appliedAt });
          const rec: EligibilityRuleRecord = { id: featureId, version: newVersion, waveRules: ver.waveRules, rg3Before: applied?.rg3Before, appliedBy: userName, appliedAt: new Date().toISOString() };
          if (applied) store.update("eligibilityRules", featureId, rec);
          else store.create("eligibilityRules", rec);
          store.audit({ actor: userName, action: "ELIGIBILITY_ROLLBACK", objectType: "Feature", objectId: featureId, before: `v${applied?.version}`, after: `v${newVersion} (=v${ver.version})`, reason: "Rolled back targeting rule" });
          message.success(`v${ver.version} 내용으로 롤백 (새 버전 v${newVersion})`);
          setHistoryOpen(false);
        }),
    });
  };

  // ③ 전체 롤백(적용 취소) — Rule 제거 + RG3·Lifecycle 복원
  const unApply = () => {
    if (!featureId || !applied) return;
    const feature = features.find((f) => f.id === featureId)!;
    confirmDecision({
      title: "적용 취소 (RG3·Lifecycle 롤백)",
      danger: true,
      okText: "전체 롤백",
      content: `${featureId}의 Targeting 적용을 취소합니다. RG3 Variant Gate를 적용 전 상태(${applied.rg3Before ?? "NOT_STARTED"})로 되돌리고 Lifecycle을 재계산합니다. Fleet은 전체 플릿 기준으로 복귀합니다.`,
      onOk: () =>
        mutate(() => {
          // 이력 보관 후 현재 적용 레코드 제거
          store.create<EligibilityVersionRecord>("eligibilityHistory", { id: `${featureId}-v${applied.version}-unapplied`, featureId, version: applied.version, waveRules: applied.waveRules, appliedBy: applied.appliedBy, appliedAt: applied.appliedAt });
          store.remove("eligibilityRules", featureId);
          // RG3 복원 + Lifecycle 재계산
          const rg3Id = `${featureId}-RG3`;
          const rg3 = store.get<Gate>("gates", rg3Id);
          const restore = applied.rg3Before ?? "NOT_STARTED";
          if (rg3) {
            store.update<Gate>("gates", rg3Id, { status: restore, approver: undefined, approvalDate: undefined, evidenceCount: 0 });
            store.audit({ actor: userName, action: "RG3_ROLLBACK", objectType: "Gate", objectId: rg3Id, before: rg3.status, after: restore, reason: "Targeting un-applied" });
            const fresh = store.list<Gate>("gates").filter((g) => g.featureId === featureId);
            const ns = derivedLifecycleStatus(fresh);
            if (ns !== feature.status) {
              store.update<Feature>("features", featureId, { status: ns, updatedAt: new Date().toISOString() });
              store.audit({ actor: "system", action: "LIFECYCLE_TRANSITION", objectType: "Feature", objectId: featureId, before: feature.status, after: ns, reason: "RG3 rolled back via un-apply" });
            }
          }
          store.audit({ actor: userName, action: "ELIGIBILITY_UNAPPLIED", objectType: "Feature", objectId: featureId, before: `v${applied.version}`, after: "none", reason: "Full rollback (RG3 + Lifecycle reverted)" });
          message.warning("적용 취소 완료 — RG3·Lifecycle 복원, Fleet 전체 플릿 복귀");
          setHistoryOpen(false);
        }),
    });
  };

  const conditions = [
    { k: "requireSw3" as const, label: "SW ≥ 3.0" },
    { k: "minModelYear2024" as const, label: "Model Year ≥ 2024" },
    { k: "requireEntitlement" as const, label: "Entitlement 보유" },
    { k: "requireConnectivity" as const, label: "Connectivity 정상" },
  ];

  return (
    <div>
      <PageHeader
        title="Feature Targeting & Eligibility"
        subtitle="UI-017/018/024 · Wave별 점진 확대 통제 · 적용 시 Policy Rule 생성 + RG3 Variant Gate 반영"
        icon="🎯"
        extra={<Select style={{ width: 300 }} value={featureId} onChange={setFeatureId} options={features.map((f) => ({ value: f.id, label: `${f.id} · ${f.name}` }))} />}
      />
      <DataQualityBanner />

      {applied && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16, borderRadius: 12 }}
          message={`적용됨 v${applied.version} (by ${applied.appliedBy}) — Fleet Wave 대상수 + RG3 반영 중.`}
          action={<Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>버전 이력 ({history.length + 1})</Button>}
        />
      )}

      {/* Wave 선택 + 점진 확대 요약 */}
      <Card className="fp-card-lift" style={{ marginBottom: 16 }} title="Rollout Wave (점진 확대)" extra={<Button size="small" onClick={applyPreset}>점진 확대 프리셋</Button>}>
        <Segmented block value={selectedWave} onChange={(v) => setSelectedWave(v as string)} options={waveNames} style={{ marginBottom: 12 }} />
        <Row gutter={12}>
          {waveEligibles.map((w) => (
            <Col key={w.wave} flex="1 1 0">
              <div style={{ textAlign: "center", padding: 8, borderRadius: 10, background: w.wave === selectedWave ? "rgba(6,182,212,0.12)" : "#f8fafc", border: w.wave === selectedWave ? "1px solid #06b6d4" : "1px solid #eef2f8" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>{w.wave}</div>
                <div className="fp-display" style={{ fontSize: 20, fontWeight: 700, color: "#0a1f44" }}>{fmtVeh(w.eligible)}</div>
                <div style={{ height: 6, borderRadius: 6, background: "#eef2f8", marginTop: 6 }}>
                  <div style={{ width: `${(w.eligible / maxWaveElig) * 100}%`, height: "100%", borderRadius: 6, background: "#0891b2" }} />
                </div>
              </div>
            </Col>
          ))}
        </Row>
        {nonMonotonic && <Alert type="warning" showIcon style={{ marginTop: 10 }} message="점진 확대 권장: 후속 Wave가 이전 Wave보다 좁습니다. 일반적으로 Pilot→100%로 대상이 커져야 합니다." />}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title={`Rule Builder · ${selectedWave}`} className="fp-card-lift" style={{ height: "100%" }}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Field label="🌍 지역"><Select mode="multiple" allowClear style={{ width: "100%" }} placeholder="전체" value={rule.regions} onChange={(v) => setRule({ ...rule, regions: v })} options={REGION_IDS.map((r) => ({ value: r, label: r }))} /></Field>
              <Field label="🚘 트림"><Select mode="multiple" allowClear style={{ width: "100%" }} placeholder="전체" value={rule.trims} onChange={(v) => setRule({ ...rule, trims: v })} options={TRIM_IDS.map((t) => ({ value: t, label: t }))} /></Field>
              <Field label="🔧 HW 버전"><Select mode="multiple" allowClear style={{ width: "100%" }} placeholder="전체 HW" value={rule.hwVersions} onChange={(v) => setRule({ ...rule, hwVersions: v })} options={HW_VERSIONS.map((h) => ({ value: h, label: h }))} /></Field>
              <Field label="🧩 옵션 코드 (모두 장착)"><Select mode="multiple" allowClear style={{ width: "100%" }} placeholder="옵션 무관" value={rule.optionCodes} onChange={(v) => setRule({ ...rule, optionCodes: v })} options={OPTION_CODES.map((o) => ({ value: o, label: o }))} /></Field>
              <Divider style={{ margin: "4px 0" }} />
              {conditions.map((c) => (
                <Space key={c.k} style={{ justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: 13 }}>{c.label}</span>
                  <Switch checked={rule[c.k] as boolean} onChange={(v) => setRule({ ...rule, [c.k]: v })} />
                </Space>
              ))}
              <Button type="primary" icon={<AimOutlined />} block disabled={!canApply || !featureId} onClick={applyRule}>Fleet에 적용 + RG3 반영</Button>
              {!canApply && <span style={{ fontSize: 12, color: "#9a3412" }}>적용 권한 필요 (Release Owner/PMO)</span>}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={`Target Population · ${selectedWave}`} className="fp-card-lift" style={{ height: "100%" }}>
            <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
              <RadialGauge value={result.pct} sublabel={`${fmtVeh(result.eligible)} / ${fmtVeh(result.total)}`} color="#06b6d4" size={140} />
            </div>
            <BarRow label="전체 플릿" value={result.total} max={result.total} color="#1f4e78" />
            <BarRow label="조건 충족" value={result.eligible} max={result.total} color="#0891b2" />
            {/* ① 생성된 Policy Rule (UI-024) */}
            <Divider style={{ margin: "10px 0" }} />
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>🛠 Generated Runtime Policy (UI-024)</div>
            <div className="fp-mono" style={{ fontSize: 12, background: "#0a1f44", color: "#7fdfef", padding: "10px 12px", borderRadius: 8, wordBreak: "break-all" }}>
              activate if {policyExpr}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>적용 시 RG3 Variant Gate 근거 + Policy Platform 배포 조건으로 사용. <Link to="/gates">RG3 →</Link> · <Link to="/control">Control →</Link></div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="VIN Eligibility Lookup" className="fp-card-lift" style={{ height: "100%" }}>
            <AutoComplete
              style={{ width: "100%", marginBottom: 12 }}
              placeholder={`VIN 검색 (시드 ${vehicles.length}대)`}
              value={vinQuery}
              onChange={setVinQuery}
              onSelect={(v) => { setCheckedVin(v); setVinQuery(v); }}
              options={vehicles.filter((v) => v.id.toLowerCase().includes(vinQuery.toLowerCase())).slice(0, 8).map((v) => ({ value: v.id, label: `${v.id} · ${v.region}/${v.trim}` }))}
              allowClear
            />
            {checkedVehicle && vinResult ? (
              <>
                <Space wrap style={{ marginBottom: 8 }}>
                  <Tag className="fp-mono">{checkedVehicle.id}</Tag>
                  <Tag color="#1f4e78">{checkedVehicle.region}</Tag>
                  <Tag color="#0891b2">{checkedVehicle.trim}</Tag>
                  <Tag>MY{checkedVehicle.modelYear}</Tag>
                  <Tag>{checkedVehicle.hw}</Tag>
                  <Tag>SW {checkedVehicle.sw}</Tag>
                </Space>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>옵션: {checkedVehicle.options.join(", ") || "—"}</div>
                <Alert type={vinResult.eligible ? "success" : "error"} showIcon message={vinResult.eligible ? `ELIGIBLE (${selectedWave})` : "NOT ELIGIBLE"} style={{ marginBottom: 8 }} />
                {vinResult.checks.filter((c) => c.required).map((c) => (
                  <div key={c.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                    <span>{c.pass ? "✅" : "❌"} {c.label}</span>
                    <span className="fp-mono" style={{ color: c.pass ? "#15803d" : "#b91c1c" }}>{c.detail}</span>
                  </div>
                ))}
                {vinResult.checks.every((c) => !c.required) && <span style={{ fontSize: 12, color: "#94a3b8" }}>활성 조건 없음</span>}
              </>
            ) : (
              <span style={{ fontSize: 13, color: "#94a3b8" }}>시드 차량 DB({vehicles.length}대)에서 VIN 검색 → 선택한 Wave Rule 기준 적용 여부.</span>
            )}
          </Card>
        </Col>
      </Row>

      <Card title={`Region × Trim Heatmap · ${selectedWave}`} className="fp-card-lift" style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "4px 8px" }}>Region \ Trim</th>
                {TRIM_IDS.map((t) => <th key={t} style={{ fontSize: 12, color: "#64748b", padding: "4px 8px" }}>{t}</th>)}
                <th style={{ fontSize: 12, color: "#0a1f44", padding: "4px 8px" }}>합계</th>
              </tr>
            </thead>
            <tbody>
              {REGION_IDS.map((region) => {
                const rowCells = result.matrix.filter((m) => m.region === region);
                const rowEligible = rowCells.reduce((s, x) => s + x.eligible, 0);
                return (
                  <tr key={region}>
                    <td style={{ fontWeight: 600, fontSize: 13, padding: "4px 8px" }}>{region}</td>
                    {TRIM_IDS.map((trim) => {
                      const cell = rowCells.find((m) => m.trim === trim)!;
                      return (
                        <td key={trim} style={{ background: heatColor(cell.count ? cell.eligible / maxCell : 0), borderRadius: 8, padding: "10px 8px", textAlign: "center", minWidth: 96 }}>
                          <div className="fp-mono" style={{ fontWeight: 700, color: "#0a1f44" }}>{fmtVeh(cell.eligible)}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>/ {fmtVeh(cell.count)}</div>
                        </td>
                      );
                    })}
                    <td className="fp-mono" style={{ fontWeight: 700, textAlign: "center", color: "#0891b2" }}>{fmtVeh(rowEligible)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`시드 차량 DB (${vehicles.length}대) — ${selectedWave} Rule 적용 결과`} className="fp-card-lift" style={{ marginTop: 16 }}>
        <Table<VehicleRecord>
          rowKey="id"
          dataSource={vehicles}
          size="small"
          pagination={{ pageSize: 10 }}
          onRow={(v) => ({ onClick: () => { setCheckedVin(v.id); setVinQuery(v.id); }, style: { cursor: "pointer" } })}
          columns={[
            { title: "VIN", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
            { title: "Region", dataIndex: "region" },
            { title: "Trim", dataIndex: "trim" },
            { title: "MY", dataIndex: "modelYear", render: (v) => <span className="fp-mono">{v}</span> },
            { title: "HW", dataIndex: "hw" },
            { title: "SW", dataIndex: "sw", render: (v) => <span className="fp-mono">{v}</span> },
            { title: "Options", dataIndex: "options", render: (o: string[]) => o.map((x) => <Tag key={x} style={{ marginInline: 1 }}>{x}</Tag>) },
            { title: "Eligible", render: (_, v) => (checkVehicle(v, rule).eligible ? <Tag color="#15803d">ELIGIBLE</Tag> : <Tag color="#9a3412">NO</Tag>) },
            {
              title: "Activation",
              render: (_, v) => {
                const a = actByVin.get(v.id);
                return a ? <Tag color={a.status === "ACTIVATED" ? "#15803d" : a.status === "FAILED" ? "#b45309" : "#475569"}>{a.status}{a.wave ? ` · ${a.wave}` : ""}</Tag> : <Tag>—</Tag>;
              },
            },
          ]}
        />
      </Card>

      {/* ② 버전 이력 / 롤백 */}
      <Drawer title={`적용 이력 / 롤백 · ${featureId}`} width={520} open={historyOpen} onClose={() => setHistoryOpen(false)}>
        {applied && canApply && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="전체 롤백 (적용 취소)"
            description={`RG3 Variant Gate를 적용 전(${applied.rg3Before ?? "NOT_STARTED"})으로 되돌리고 Lifecycle을 재계산합니다.`}
            action={<Button danger size="small" onClick={unApply}>적용 취소</Button>}
          />
        )}
        <Timeline
          items={[
            ...(applied ? [{
              color: "#15803d",
              children: (
                <div>
                  <strong>v{applied.version}</strong> <Tag color="#15803d">현재 적용</Tag>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{new Date(applied.appliedAt).toLocaleString()} · {applied.appliedBy}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>최종 Wave 대상: {applied.waveRules[applied.waveRules.length - 1]?.eligible.toLocaleString()} 대</div>
                </div>
              ),
            }] : []),
            ...history.map((h) => ({
              color: "#94a3b8",
              children: (
                <div>
                  <strong>v{h.version}</strong>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{new Date(h.appliedAt).toLocaleString()} · {h.appliedBy}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>최종 Wave 대상: {h.waveRules[h.waveRules.length - 1]?.eligible.toLocaleString()} 대</div>
                  {canApply && <Button size="small" style={{ marginTop: 6 }} onClick={() => rollback(h)}>이 버전으로 롤백</Button>}
                </div>
              ),
            })),
          ]}
        />
        {!applied && <span style={{ color: "#94a3b8" }}>아직 적용 이력이 없습니다.</span>}
      </Drawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
