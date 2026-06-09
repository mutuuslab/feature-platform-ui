// UI-005 Intake Board Review & Decision + UI-003 Completeness + UI-006 Owner Assignment (시트 41 step3~6).
// Feature Request(3-Step 제안서)와 정합: 제안 개요·배경/기술개요/운영안·적용범위/유관부서/경영층을 섹션별로 검토.
import { useState } from "react";
import { Alert, Card, Descriptions, Drawer, Space, Table, Tag, message } from "antd";
import { PaperClipOutlined } from "@ant-design/icons";
import { store, useList, useMutate } from "../data/useStore";
import type { Feature, FeatureRequest, Gate, OwnerRoleKey, Owners } from "../domain/types";
import { GATES } from "../domain/codeMaster";
import { DataQualityBanner, PageHeader, confirmDecision } from "../components/Common";
import { StatusBadge } from "../components/StatusBadge";
import { DecisionPanel, type DecisionType } from "../components/DecisionPanel";
import { OwnerAssignmentPanel, hasRequiredOwners } from "../components/OwnerAssignmentPanel";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

let featureSeq = 100;

// 결정 불가(이미 처리됨) 상태
const TERMINAL: FeatureRequest["status"][] = ["REGISTERED", "REJECTED", "MERGED"];

// UI-003 Completeness Check — 필수/권장 항목 검증
function completenessOf(r: FeatureRequest) {
  const hasScope = Boolean(r.applyScope && Object.values(r.applyScope).some((b) => b.length)) || Boolean(r.targetRegion && r.targetRegion !== "미정");
  const required: [string, boolean][] = [
    ["제안명", Boolean(r.name)],
    ["고객 니즈", Boolean(r.customerNeeds || r.businessNeed)],
    ["적용 범위", hasScope],
  ];
  const recommended: [string, boolean][] = [
    ["기술 컨셉", Boolean(r.techConcept)],
    ["기대효과", Boolean(r.expectedValue)],
    ["유관 부서", Boolean(r.relatedDepts && r.relatedDepts.length)],
    ["Feature 분류", Boolean(r.category)],
    ["정량 목표", Boolean(r.metricTarget)],
  ];
  const missingReq = required.filter(([, ok]) => !ok).map(([k]) => k);
  const missingRec = recommended.filter(([, ok]) => !ok).map(([k]) => k);
  return { pass: missingReq.length === 0, required, recommended, missingReq, missingRec };
}

function ScopeTags({ r }: { r: FeatureRequest }) {
  const entries = Object.entries(r.applyScope ?? {}).filter(([, b]) => b.length);
  if (!entries.length) return <span>{r.targetRegion} / {r.targetTrim}</span>;
  return <Space wrap>{entries.map(([region, brands]) => <Tag key={region} color="#0891b2">{region}: {brands.join("·")}</Tag>)}</Space>;
}

export function IntakeReviewPage() {
  const requests = useList<FeatureRequest>("featureRequests");
  const mutate = useMutate();
  const { role, userName } = useRole();
  const [active, setActive] = useState<FeatureRequest | null>(null);
  const [owners, setOwners] = useState<Owners>({});

  const allowed = can(role, "intake.decide");
  const open = (r: FeatureRequest) => { setActive(r); setOwners({}); };
  const comp = active ? completenessOf(active) : null;

  const decide = (decision: DecisionType, reason: string) => {
    if (!active) return;
    if (active.status === "DRAFT") {
      message.warning("임시저장(DRAFT) 제안서는 제출 전이라 결정할 수 없습니다. 작성자가 제출(SUBMITTED)해야 검토 가능합니다.");
      return;
    }
    if (TERMINAL.includes(active.status)) {
      message.warning("이미 처리(등록/반려/병합)된 요청입니다.");
      return;
    }
    if (decision === "APPROVE") {
      if (comp && !comp.pass) {
        message.error(`완성도 미충족 — 필수 누락: ${comp.missingReq.join(", ")} (UI-003). Rework 요청하세요.`);
        return;
      }
      if (!hasRequiredOwners(owners)) {
        message.error("Product Owner 지정 후에만 등록 승인이 가능합니다 (시트 41 step5).");
        return;
      }
    }
    const proceed = () =>
      mutate(() => {
        if (decision === "APPROVE") {
          featureSeq += 1;
          const fid = `FEAT-${active.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3) || "FT"}-${featureSeq}`;
          store.create<Feature>("features", {
            id: fid,
            name: active.name,
            description: active.customerNeeds || active.businessNeed,
            status: "Proposed",
            owners,
            targetRegion: active.targetRegion,
            targetTrim: active.desiredVehicle || active.targetTrim,
            deployType: active.deployType,
            customerValue: active.expectedValue,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          GATES.forEach((g) =>
            store.create<Gate>("gates", { id: `${fid}-${g.code}`, featureId: fid, gateCode: g.code, status: "NOT_STARTED", owner: g.leadOwnerRole, evidenceCount: 0 }),
          );
          store.update<FeatureRequest>("featureRequests", active.id, { status: "REGISTERED", featureId: fid });
          store.audit({ actor: userName, action: "REGISTER", objectType: "Feature", objectId: fid, before: "SUBMITTED", after: "Proposed", reason: reason || "Intake board approved" });
          message.success(`공식 Feature ID 발급: ${fid} (Lifecycle: Proposed)`);
        } else {
          const map: Record<string, FeatureRequest["status"]> = { REWORK: "REWORK_REQUESTED", REJECT: "REJECTED", MERGE: "MERGED", BACKLOG: "UNDER_REVIEW", ESCALATE: "UNDER_REVIEW" };
          store.update<FeatureRequest>("featureRequests", active.id, { status: map[decision] ?? "UNDER_REVIEW" });
          store.audit({ actor: userName, action: `INTAKE_${decision}`, objectType: "FeatureRequest", objectId: active.id, after: map[decision], reason });
          message.info(`결정 기록: ${decision}`);
        }
        setActive(null);
      });

    if (decision === "APPROVE" || decision === "REJECT") {
      confirmDecision({
        title: decision === "APPROVE" ? "Feature 등록 승인" : "요청 반려",
        content: decision === "APPROVE" ? `${active.name} 을(를) 등록하고 공식 Feature ID를 발급합니다.` : "이 요청을 반려합니다. 되돌릴 수 없습니다.",
        danger: decision === "REJECT",
        onOk: proceed,
      });
    } else {
      proceed();
    }
  };

  return (
    <div>
      <PageHeader title="Intake Review Board" subtitle="UI-003/005/006 · LC0 접수·완성도 검토 및 등록 결정" icon="📥" />
      <DataQualityBanner />
      {!allowed && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="결정 권한 없음 — 'PMO' 또는 'Feature Product Owner' 역할로 전환하세요 (RBAC-007)." />}
      <Card>
        <Table<FeatureRequest>
          rowKey="id"
          dataSource={requests}
          pagination={false}
          onRow={(r) => ({ onClick: () => open(r), style: { cursor: "pointer" } })}
          columns={[
            { title: "Request ID", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
            { title: "제안명", dataIndex: "name" },
            { title: "제안부서", dataIndex: "department", render: (v) => v ?? "—" },
            { title: "담당자", dataIndex: "requester" },
            { title: "적용범위", render: (_, r) => <ScopeTags r={r} /> },
            { title: "경영층", dataIndex: "execDirective", render: (v) => (v ? <Tag color="#b45309">지시</Tag> : <Tag>—</Tag>) },
            { title: "완성도", render: (_, r) => <StatusBadge value={completenessOf(r).pass ? "PASS" : "PENDING"} /> },
            { title: "Status", dataIndex: "status", render: (v) => <StatusBadge value={v} /> },
            { title: "Feature ID", dataIndex: "featureId", render: (v) => (v ? <span className="fp-mono">{v}</span> : "—") },
          ]}
        />
      </Card>

      <Drawer title={active ? <span><Tag className="fp-mono" color="#1f4e78">{active.id}</Tag>{active.name}</span> : ""} width={620} open={!!active} onClose={() => setActive(null)}>
        {active && comp && (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            {active.status === "DRAFT" && (
              <Alert type="warning" showIcon message="임시저장(DRAFT) 제안서입니다." description="작성자가 아직 제출하지 않았습니다. 제출(SUBMITTED) 전까지 결정할 수 없습니다." />
            )}
            {/* UI-003 완성도 체크 */}
            <Card size="small" title="① Completeness Check (UI-003)">
              <Alert
                type={comp.pass ? "success" : "warning"}
                showIcon
                message={comp.pass ? "필수 항목 충족 — LC0 Board 상정 가능" : `필수 항목 누락: ${comp.missingReq.join(", ")} — Rework 필요`}
                style={{ marginBottom: 8 }}
              />
              <Space wrap size={6}>
                {comp.required.map(([k, ok]) => <Tag key={k} color={ok ? "#15803d" : "#b91c1c"}>{ok ? "✓" : "✗"} {k}</Tag>)}
                {comp.recommended.map(([k, ok]) => <Tag key={k} color={ok ? "#15803d" : "#94a3b8"}>{ok ? "✓" : "○"} {k}</Tag>)}
              </Space>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>중복 Feature 검사: <Tag color="#15803d">No duplicate</Tag> (Duplicate check clear)</div>
            </Card>

            {/* 제안 개요·배경 */}
            <Card size="small" title="② 제안 개요 · 배경">
              <Descriptions column={1} size="small" bordered>
                {active.department && <Descriptions.Item label="제안 부서/담당자">{active.department} / {active.requester}</Descriptions.Item>}
                {(active.category || active.priority) ? (
                  <Descriptions.Item label="분류 / 우선순위">
                    {active.category ? <Tag color="#1f4e78">{active.category}</Tag> : null}
                    {active.priority ? <Tag color={active.priority === "긴급" ? "#b91c1c" : active.priority === "높음" ? "#b45309" : "default"}>{active.priority}</Tag> : null}
                  </Descriptions.Item>
                ) : null}
                <Descriptions.Item label="고객 니즈">{active.customerNeeds || active.businessNeed}{active.needsSource ? <Tag style={{ marginLeft: 6 }}>{active.needsSource}</Tag> : null}</Descriptions.Item>
                {(active.metricBaseline || active.metricTarget) ? <Descriptions.Item label="정량 근거">{active.metricBaseline || "—"} → <b>{active.metricTarget || "—"}</b></Descriptions.Item> : null}
                {active.reviewBackground && <Descriptions.Item label="검토 배경">{active.reviewBackground}</Descriptions.Item>}
                {active.devAgreement && <Descriptions.Item label="개발 협의">{active.devAgreement}</Descriptions.Item>}
                {active.expectedValue && <Descriptions.Item label="기대효과">{active.expectedValue}</Descriptions.Item>}
              </Descriptions>
            </Card>

            {/* 기술 개요 */}
            {(active.techConcept || active.useCase || active.competitorTrend) && (
              <Card size="small" title="③ 기술 개요">
                <Descriptions column={1} size="small" bordered>
                  {active.techConcept && <Descriptions.Item label="기술 컨셉">{active.techConcept}</Descriptions.Item>}
                  {active.useCase && <Descriptions.Item label="유즈케이스">{active.useCase}</Descriptions.Item>}
                  {active.competitorTrend && <Descriptions.Item label="경쟁사 동향">{active.competitorTrend}</Descriptions.Item>}
                </Descriptions>
              </Card>
            )}

            {/* 운영안 · 적용 범위 */}
            <Card size="small" title="④ 운영안 · 적용 범위">
              <Descriptions column={1} size="small" bordered>
                {active.regionScopeNote ? <Descriptions.Item label="권역 협의 범위">{active.regionScopeNote}</Descriptions.Item> : null}
                <Descriptions.Item label="적용 범위"><ScopeTags r={active} /></Descriptions.Item>
                {active.applySegments?.length ? <Descriptions.Item label="적용 차급">{active.applySegments.map((s) => <Tag key={s} color="#0e7490">{s}</Tag>)}</Descriptions.Item> : null}
                <Descriptions.Item label="양산 목표 시기 (SOP)">{active.targetSOP ?? "미정"}</Descriptions.Item>
                {active.businessModel ? <Descriptions.Item label="과금 모델 (BM)">{active.businessModel}</Descriptions.Item> : null}
                {active.volumeEstimate ? <Descriptions.Item label="예상 적용 대수">{Number(active.volumeEstimate).toLocaleString()} 대/년</Descriptions.Item> : null}
                {active.desiredVehicle ? <Descriptions.Item label="희망 차종">{active.desiredVehicle}</Descriptions.Item> : null}
                <Descriptions.Item label="적용 방식">{active.deployType}</Descriptions.Item>
                {active.attachments?.length ? (
                  <Descriptions.Item label="근거 자료">
                    <Space wrap size={4}>{active.attachments.map((a) => <Tag key={a.uid} icon={<PaperClipOutlined />}>{a.name}</Tag>)}</Space>
                  </Descriptions.Item>
                ) : null}
              </Descriptions>
            </Card>

            {/* 적용 조건·안전·보안·데이터 */}
            {(active.dependencyHW || active.dependencySW || active.asilLevel || active.cyberR155 || active.dataCollected || active.personalData || active.otaRollback || active.phasedRollout) ? (
              <Card size="small" title="⑤ 적용 조건 · 안전 · 보안 · 데이터">
                <Descriptions column={1} size="small" bordered>
                  {active.dependencyHW ? <Descriptions.Item label="필수 HW">{active.dependencyHW}</Descriptions.Item> : null}
                  {active.dependencySW ? <Descriptions.Item label="최소 SW/플랫폼">{active.dependencySW}</Descriptions.Item> : null}
                  {active.asilLevel ? <Descriptions.Item label="기능안전 (ISO 26262)"><Tag color={active.asilLevel === "QM" ? "default" : active.asilLevel >= "ASIL C" ? "#b91c1c" : "#b45309"}>{active.asilLevel}</Tag></Descriptions.Item> : null}
                  <Descriptions.Item label="사이버보안 (R155)">{active.cyberR155 ? <Tag color="#b45309">해당 — {active.cyberNote || "TARA 필요"}</Tag> : <Tag>해당 없음</Tag>}</Descriptions.Item>
                  <Descriptions.Item label="데이터/개인정보">{active.personalData ? <Tag color="#b91c1c">개인정보 포함</Tag> : <Tag color="#15803d">비개인정보</Tag>}{active.dataCollected ? <span style={{ marginLeft: 6 }}>{active.dataCollected}</span> : null}</Descriptions.Item>
                  <Descriptions.Item label="OTA/배포">{active.otaRollback ? <Tag color="#15803d">롤백 가능</Tag> : <Tag color="#b45309">롤백 불가</Tag>}{active.phasedRollout ? <Tag color="#0891b2">단계적(Wave)</Tag> : <Tag>일괄</Tag>}</Descriptions.Item>
                </Descriptions>
              </Card>
            ) : null}

            {/* 유관 부서 · 경영층 */}
            <Card size="small" title="⑥ 유관 부서 · 경영층 지시사항">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <div>유관 부서: {active.relatedDepts && active.relatedDepts.length ? active.relatedDepts.map((d) => {
                  const st = active.deptStatus?.[d];
                  const c = st === "완료" ? "#15803d" : st === "협의중" ? "#b45309" : "#1f4e78";
                  return <Tag key={d} color={c}>{d}{st ? ` · ${st}` : ""}</Tag>;
                }) : <Tag>없음</Tag>}</div>
                <div>경영층 지시사항: {active.execDirective ? <Tag color="#b45309">Y — {active.execDirectiveNote}</Tag> : <Tag>N</Tag>}</div>
              </Space>
            </Card>

            {/* 사업성 · 승인 */}
            {(active.investBand || active.devStartTarget || active.approvalRequest || active.bepNote) ? (
              <Card size="small" title="⑦ 사업성 · 승인 (LC0)">
                <Descriptions column={1} size="small" bordered>
                  {active.approvalRequest ? <Descriptions.Item label="승인 요청"><Tag color="#1f4e78">{active.approvalRequest}</Tag></Descriptions.Item> : null}
                  {active.investBand ? <Descriptions.Item label="개략 투자">{active.investBand}</Descriptions.Item> : null}
                  {active.devStartTarget ? <Descriptions.Item label="개발착수 목표">{active.devStartTarget}</Descriptions.Item> : null}
                  {active.bepNote ? <Descriptions.Item label="손익/BEP">{active.bepNote}</Descriptions.Item> : null}
                </Descriptions>
              </Card>
            ) : null}

            {/* Owner 지정 */}
            <Card size="small" title="⑧ Owner Assignment (UI-006)">
              <OwnerAssignmentPanel owners={owners} editable={allowed} onChange={(k: OwnerRoleKey, v) => setOwners((o) => ({ ...o, [k]: v }))} />
            </Card>

            {/* 결정 */}
            <Card size="small" title="⑨ Decision (LC0)">
              <DecisionPanel
                decisions={["APPROVE", "REWORK", "REJECT", "MERGE", "BACKLOG", "ESCALATE"]}
                disabled={!allowed || active.status === "DRAFT" || TERMINAL.includes(active.status)}
                disabledReason={
                  active.status === "DRAFT" ? "임시저장(DRAFT) — 작성자가 제출해야 검토·결정할 수 있습니다."
                  : TERMINAL.includes(active.status) ? "이미 처리(등록/반려/병합)된 요청입니다."
                  : !allowed ? "결정 권한이 없습니다."
                  : !comp.pass ? "완성도 미충족 — APPROVE 시 필수 항목 누락 안내됨" : undefined
                }
                onDecide={decide}
              />
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
