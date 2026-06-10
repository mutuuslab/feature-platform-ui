// Unleash Feature Flag 콘솔 (안 A · headless) — 운영자는 이 화면에서만 플래그를 관리(Unleash UI 미사용).
// 플랫폼=SoR: EligibilityRule→constraints 매핑, 환경별 토글·rollout, RG3 게이트로 prod sync 가드, 드리프트·metrics.
import { useState } from "react";
import { Alert, Button, Card, Drawer, InputNumber, Space, Switch, Table, Tag, Tooltip } from "antd";
import { ThunderboltOutlined, StopOutlined, SettingOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { useList, useMutate } from "../data/useStore";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { useRole } from "../auth/RoleContext";
import type { Feature, Gate } from "../domain/types";
import { EMPTY_RULE, ruleToUnleash, type EligibilityRuleRecord } from "../data/population";
import { flagDrift, flagKeyOf, flagMetrics, flagMode, getFlagState, setFlagEnabled, setFlagRollout, syncFlag, FLAG_ENVS } from "../data/flagProvider";

const ENV_COLOR: Record<string, string> = { dev: "#64748b", qa: "#b45309", prod: "#15803d" };

export function FlagConsolePage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");
  const eligRules = useList<EligibilityRuleRecord>("eligibilityRules");
  useList("flagStates"); // 반응성 구독
  const mutate = useMutate();
  const { userName } = useRole();
  const mode = flagMode();
  const [manage, setManage] = useState<Feature | null>(null);

  const rg3Pass = (fid: string) => gates.find((g) => g.featureId === fid && g.gateCode === "RG3")?.status === "PASS";
  const ruleOf = (fid: string) => eligRules.find((r) => r.id === fid)?.waveRules.at(-1)?.rule ?? EMPTY_RULE;
  const desiredOf = (fid: string, rollout: number) => ruleToUnleash(ruleOf(fid), { flagKey: flagKeyOf(fid), rollout });

  return (
    <div>
      <PageHeader
        title="Feature Flag 콘솔"
        subtitle="Unleash(OSS) 연동 · headless — 플랫폼에서만 관리, Unleash 콘솔 미사용"
        icon="🚩"
        extra={<Tag bordered={false} style={{ background: mode === "unleash" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.16)", color: mode === "unleash" ? "#86efac" : "#cfe7f5" }}>{mode === "unleash" ? "Unleash 연결됨" : "Mock 모드"}</Tag>}
      />
      <DataQualityBanner />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Feature = Unleash flag · 적용범위(EligibilityRule) = constraints · Wave % = flexibleRollout(stickiness=VIN)."
        description="production sync 는 RG3(Policy) PASS 시에만 허용됩니다. 모든 변경은 감사로그에 기록됩니다."
      />
      <Card>
        <Table<Feature>
          rowKey="id"
          dataSource={features}
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Feature", render: (_, f) => <span><Link to={`/features/${f.id}`} className="fp-mono">{f.id}</Link><div style={{ fontSize: 12, color: "#64748b" }}>{f.name}</div></span> },
            { title: "Flag Key", render: (_, f) => <span className="fp-mono">{flagKeyOf(f.id)}</span> },
            {
              title: "Constraints (룰 매핑)",
              render: (_, f) => {
                const summary = ruleToUnleash(ruleOf(f.id), { flagKey: flagKeyOf(f.id), rollout: 100 }).summary;
                return <Tooltip title={summary}><span style={{ fontSize: 12, color: "#475569", maxWidth: 220, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span></Tooltip>;
              },
            },
            {
              title: "환경 상태",
              render: (_, f) => {
                const s = getFlagState(f.id);
                return <Space size={4}>{FLAG_ENVS.map((e) => <Tag key={e} color={s.envs[e].enabled ? ENV_COLOR[e] : "default"}>{e} {s.envs[e].enabled ? `${s.envs[e].rollout}%` : "off"}</Tag>)}</Space>;
              },
            },
            {
              title: "prod rollout",
              render: (_, f) => {
                const s = getFlagState(f.id);
                return <InputNumber size="small" min={0} max={100} value={s.envs.prod.rollout} formatter={(v) => `${v}%`} parser={(v) => Number((v ?? "").replace("%", ""))} onChange={(v) => mutate(() => setFlagRollout(f.id, "prod", Number(v ?? 0)))} style={{ width: 90 }} disabled={!s.envs.prod.enabled} />;
              },
            },
            {
              title: "Drift",
              render: (_, f) => {
                const desired = ruleToUnleash(ruleOf(f.id), { flagKey: flagKeyOf(f.id), rollout: 100 }).summary;
                const d = flagDrift(f.id, desired);
                return d === null ? <Tag>미동기화</Tag> : d ? <Tag color="#b45309">드리프트</Tag> : <Tag color="#15803d">동기화됨</Tag>;
              },
            },
            {
              title: "Metrics",
              render: (_, f) => {
                const m = flagMetrics(f.id);
                return <span style={{ fontSize: 12, color: "#64748b" }} className="fp-mono">{m.exposures.toLocaleString()} 노출 · {m.enabledPct}% on</span>;
              },
            },
            {
              title: "Action",
              render: (_, f) => {
                const s = getFlagState(f.id);
                const desired = desiredOf(f.id, s.envs.prod.rollout || 100);
                const canProd = rg3Pass(f.id);
                return (
                  <Space>
                    <Tooltip title={canProd ? "현재 룰을 prod 환경 flag로 동기화(제약 포함)" : "RG3(Policy) PASS 후 prod 동기화 가능"}>
                      <Button size="small" type="primary" icon={<ThunderboltOutlined />} disabled={!canProd} onClick={() => mutate(() => syncFlag(f.id, desired.summary, "prod", s.envs.prod.rollout || 100, userName, desired.strategy.constraints))}>
                        Sync prod
                      </Button>
                    </Tooltip>
                    <Tooltip title="prod flag 비활성(Kill switch)">
                      <Button size="small" danger icon={<StopOutlined />} disabled={!s.envs.prod.enabled} onClick={() => mutate(() => setFlagEnabled(f.id, "prod", false, userName))}>Kill</Button>
                    </Tooltip>
                    <Tooltip title="dev/qa/prod 환경 관리">
                      <Button size="small" icon={<SettingOutlined />} onClick={() => setManage(f)}>관리</Button>
                    </Tooltip>
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>

      <Drawer
        title={manage ? <span><Tag className="fp-mono" color="#1f4e78">{flagKeyOf(manage.id)}</Tag>환경 관리</span> : ""}
        width={560}
        open={!!manage}
        onClose={() => setManage(null)}
      >
        {manage && (() => {
          const s = getFlagState(manage.id);
          const canProd = rg3Pass(manage.id);
          return (
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <Alert type="info" showIcon message="dev/qa 는 자유 동기화, prod 는 RG3(Policy) PASS 후 가능. Sync 시 적용범위(constraints)가 함께 반영됩니다." />
              {FLAG_ENVS.map((e) => {
                const env = s.envs[e];
                const gated = e === "prod" && !canProd;
                const desired = desiredOf(manage.id, env.rollout || 100);
                return (
                  <Card key={e} size="small" title={<Space><Tag color={ENV_COLOR[e]}>{e}</Tag>{env.enabled ? <Tag color="#15803d">{env.rollout}% on</Tag> : <Tag>off</Tag>}</Space>}>
                    <Space wrap size={12} align="center">
                      <Space size={6}><span style={{ fontSize: 12, color: "#64748b" }}>활성</span>
                        <Switch size="small" checked={env.enabled} onChange={(on) => mutate(() => setFlagEnabled(manage.id, e, on, userName))} />
                      </Space>
                      <Space size={6}><span style={{ fontSize: 12, color: "#64748b" }}>rollout</span>
                        <InputNumber size="small" min={0} max={100} value={env.rollout} formatter={(v) => `${v}%`} parser={(v) => Number((v ?? "").replace("%", ""))} onChange={(v) => mutate(() => setFlagRollout(manage.id, e, Number(v ?? 0)))} style={{ width: 90 }} disabled={!env.enabled} />
                      </Space>
                      <Tooltip title={gated ? "RG3(Policy) PASS 후 prod 동기화 가능" : `${e} 환경에 룰+rollout 동기화`}>
                        <Button size="small" type="primary" icon={<ThunderboltOutlined />} disabled={gated} onClick={() => mutate(() => syncFlag(manage.id, desired.summary, e, env.rollout || 100, userName, desired.strategy.constraints))}>Sync {e}</Button>
                      </Tooltip>
                      <Button size="small" danger icon={<StopOutlined />} disabled={!env.enabled} onClick={() => mutate(() => setFlagEnabled(manage.id, e, false, userName))}>Kill</Button>
                    </Space>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>제약: {desired.summary}</div>
                  </Card>
                );
              })}
            </Space>
          );
        })()}
      </Drawer>
    </div>
  );
}
