// UI-005 Intake Board Review & Decision + UI-006 Owner Assignment (시트 41 step3~6).
// APPROVE → 공식 Feature ID 발급, Lifecycle=Proposed, RG1~9 초기화, Audit 기록.
import { useState } from "react";
import { Alert, Card, Descriptions, Drawer, Space, Table, Tag, message } from "antd";
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

export function IntakeReviewPage() {
  const requests = useList<FeatureRequest>("featureRequests");
  const mutate = useMutate();
  const { role, userName } = useRole();
  const [active, setActive] = useState<FeatureRequest | null>(null);
  const [owners, setOwners] = useState<Owners>({});

  const allowed = can(role, "intake.decide");
  const open = (r: FeatureRequest) => { setActive(r); setOwners({}); };

  const decide = (decision: DecisionType, reason: string) => {
    if (!active) return;
    if (decision === "APPROVE" && !hasRequiredOwners(owners)) {
      message.error("Product Owner 지정 후에만 등록 승인이 가능합니다 (시트 41 step5).");
      return;
    }
    const proceed = () =>
      mutate(() => {
        if (decision === "APPROVE") {
          featureSeq += 1;
          const fid = `FEAT-${active.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3)}-${featureSeq}`;
          store.create<Feature>("features", {
            id: fid,
            name: active.name,
            description: active.businessNeed,
            status: "Proposed",
            owners,
            targetRegion: active.targetRegion,
            targetTrim: active.targetTrim,
            deployType: active.deployType,
            customerValue: active.expectedValue,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          GATES.forEach((g) =>
            store.create<Gate>("gates", {
              id: `${fid}-${g.code}`,
              featureId: fid,
              gateCode: g.code,
              status: "NOT_STARTED",
              owner: g.leadOwnerRole,
              evidenceCount: 0,
            }),
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
      <PageHeader title="Intake Review Board" subtitle="UI-005/006 · LC0 접수 검토 및 등록 결정" icon="📥" />
      <DataQualityBanner />
      {!allowed && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="결정 권한 없음 — 'PMO' 또는 'Feature Product Owner' 역할로 전환하세요 (RBAC-007)." />}
      <Card>
        <Table<FeatureRequest>
          rowKey="id"
          dataSource={requests}
          pagination={false}
          onRow={(r) => ({ onClick: () => open(r), style: { cursor: "pointer" } })}
          columns={[
            { title: "Request ID", dataIndex: "id" },
            { title: "Name", dataIndex: "name" },
            { title: "Requester", dataIndex: "requester" },
            { title: "Region", dataIndex: "targetRegion" },
            { title: "Completeness", dataIndex: "completeness", render: (v) => (v ? <StatusBadge value={v} /> : <Tag>—</Tag>) },
            { title: "Status", dataIndex: "status", render: (v) => <StatusBadge value={v} /> },
            { title: "Feature ID", dataIndex: "featureId", render: (v) => v ?? "—" },
          ]}
        />
      </Card>

      <Drawer title={active ? `Intake Review · ${active.id}` : ""} width={560} open={!!active} onClose={() => setActive(null)}>
        {active && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="제안명">{active.name}</Descriptions.Item>
              {active.department && <Descriptions.Item label="제안 부서/담당자">{active.department} / {active.requester}</Descriptions.Item>}
              <Descriptions.Item label="고객 니즈">{active.customerNeeds || active.businessNeed}{active.needsSource ? ` (${active.needsSource})` : ""}</Descriptions.Item>
              {active.reviewBackground && <Descriptions.Item label="검토 배경">{active.reviewBackground}</Descriptions.Item>}
              {active.devAgreement && <Descriptions.Item label="개발 협의">{active.devAgreement}</Descriptions.Item>}
              {active.expectedValue && <Descriptions.Item label="기대효과">{active.expectedValue}</Descriptions.Item>}
              {active.techConcept && <Descriptions.Item label="기술 컨셉">{active.techConcept}</Descriptions.Item>}
              {active.useCase && <Descriptions.Item label="유즈케이스">{active.useCase}</Descriptions.Item>}
              {active.competitorTrend && <Descriptions.Item label="경쟁사 동향">{active.competitorTrend}</Descriptions.Item>}
              {active.regionScopeNote && <Descriptions.Item label="권역 협의 범위">{active.regionScopeNote}</Descriptions.Item>}
              <Descriptions.Item label="적용 범위">
                {active.applyScope && Object.entries(active.applyScope).some(([, b]) => b.length)
                  ? Object.entries(active.applyScope).filter(([, b]) => b.length).map(([r, b]) => <Tag key={r}>{r}: {b.join("·")}</Tag>)
                  : `${active.targetRegion} / ${active.targetTrim}`}
              </Descriptions.Item>
              {active.desiredVehicle && <Descriptions.Item label="희망 차종">{active.desiredVehicle}</Descriptions.Item>}
              <Descriptions.Item label="Deploy Type">{active.deployType}</Descriptions.Item>
              {active.relatedDepts && active.relatedDepts.length > 0 && <Descriptions.Item label="유관 부서">{active.relatedDepts.map((d) => <Tag key={d} color="#1f4e78">{d}</Tag>)}</Descriptions.Item>}
              <Descriptions.Item label="경영층 지시사항">{active.execDirective ? <Tag color="#b45309">Y — {active.execDirectiveNote}</Tag> : <Tag>N</Tag>}</Descriptions.Item>
            </Descriptions>
            <Alert type="success" showIcon message="Completeness Check: PASS" description="필수 항목 충족. 중복 Feature 없음 (Duplicate check: clear)." />
            <OwnerAssignmentPanel owners={owners} editable={allowed} onChange={(k: OwnerRoleKey, v) => setOwners((o) => ({ ...o, [k]: v }))} />
            <Card size="small" title="Decision (LC0)">
              <DecisionPanel
                decisions={["APPROVE", "REWORK", "REJECT", "MERGE", "BACKLOG", "ESCALATE"]}
                disabled={!allowed || active.status === "REGISTERED"}
                disabledReason={active.status === "REGISTERED" ? "이미 등록된 요청입니다." : !allowed ? "결정 권한이 없습니다." : undefined}
                onDecide={decide}
              />
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
