// UI-001 Feature Request — 3-Step 제안서 등록 위저드 (제안 개요/배경 · 기술개요/운영안/적용범위 · 유관부서/경영층)
import { useState } from "react";
import { Button, Card, Col, Form, Input, Result, Row, Segmented, Select, Space, Steps, Switch } from "antd";
import { ArrowRightOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { store, useMutate } from "../data/useStore";
import type { FeatureRequest } from "../domain/types";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { useRole } from "../auth/RoleContext";

const TEAMS = ["ADAS팀", "Connectivity팀", "Powertrain팀", "Body/Chassis팀", "Infotainment팀", "기획팀"];
const NEEDS_SOURCES = ["품질대외지수", "Tracking 자료", "기획조사 자료"];
const RELATED_DEPTS = ["Product", "System", "SW", "Release", "Operation", "AVP 개발", "MI", "기획", "품질", "구매", "Safety/Security"];
const REGIONS = ["국내", "북미", "유럽", "중국", "일반"];
const BRANDS = ["현대", "기아", "제네시스"];

// 적용 범위 매트릭스 (권역 × 브랜드 다중 토글)
function ScopeMatrix({ value, onChange }: { value: Record<string, string[]>; onChange: (v: Record<string, string[]>) => void }) {
  const toggle = (region: string, brand: string) => {
    const set = new Set(value[region] ?? []);
    set.has(brand) ? set.delete(brand) : set.add(brand);
    onChange({ ...value, [region]: [...set] });
  };
  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      {REGIONS.map((r) => (
        <div key={r} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 48, fontSize: 13, color: "#475569", borderLeft: "2px solid #e2e8f0", paddingLeft: 8 }}>{r}</span>
          <Space size={6}>
            {BRANDS.map((b) => {
              const on = (value[r] ?? []).includes(b);
              return (
                <Button key={b} size="small" onClick={() => toggle(r, b)} style={on ? { background: "#dcfce7", borderColor: "#15803d", color: "#15803d", fontWeight: 600 } : {}}>
                  {b}
                </Button>
              );
            })}
          </Space>
        </div>
      ))}
    </Space>
  );
}

const STEP_FIELDS: string[][] = [
  ["name", "department", "requester", "customerNeeds", "reviewBackground", "devAgreement", "expectedValue"],
  ["techConcept", "useCase", "competitorTrend", "regionScopeNote", "desiredVehicle", "deployType"],
  ["execDirectiveNote"],
];

export function FeatureRequestPage() {
  const [form] = Form.useForm();
  const mutate = useMutate();
  const { userName } = useRole();
  const allowed = true; // 데모(test): 역할 무관하게 누구나 작성 가능

  const [step, setStep] = useState(0);
  const [needsSource, setNeedsSource] = useState(NEEDS_SOURCES[0]);
  const [applyScope, setApplyScope] = useState<Record<string, string[]>>({});
  const [relatedDepts, setRelatedDepts] = useState<string[]>([]);
  const [execDirective, setExecDirective] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const next = async () => {
    try {
      await form.validateFields(STEP_FIELDS[step]);
      setStep((s) => Math.min(s + 1, 2));
    } catch {
      /* 검증 실패 시 머무름 */
    }
  };

  const buildRequest = (status: FeatureRequest["status"]): FeatureRequest => {
    const v = form.getFieldsValue(true);
    const regions = Object.entries(applyScope).filter(([, b]) => b.length).map(([r]) => r);
    return {
      id: "",
      name: v.name,
      businessNeed: v.customerNeeds || v.reviewBackground || "",
      targetRegion: regions.join(", ") || "미정",
      targetTrim: v.desiredVehicle || "미정",
      deployType: v.deployType || "Binary OTA",
      expectedValue: v.expectedValue,
      requester: v.requester || userName,
      status,
      completeness: status === "SUBMITTED" ? "PASS" : undefined,
      createdAt: new Date().toISOString(),
      department: v.department,
      needsSource,
      customerNeeds: v.customerNeeds,
      reviewBackground: v.reviewBackground,
      devAgreement: v.devAgreement,
      techConcept: v.techConcept,
      useCase: v.useCase,
      competitorTrend: v.competitorTrend,
      regionScopeNote: v.regionScopeNote,
      applyScope,
      desiredVehicle: v.desiredVehicle,
      relatedDepts,
      execDirective,
      execDirectiveNote: execDirective ? v.execDirectiveNote : undefined,
    } as FeatureRequest;
  };

  const onSubmit = async () => {
    await form.validateFields(STEP_FIELDS.flat());
    const created = mutate(() => {
      const req = store.create<FeatureRequest>("featureRequests", buildRequest("SUBMITTED"));
      store.audit({ actor: userName, action: "SUBMIT_REQUEST", objectType: "FeatureRequest", objectId: req.id, after: "SUBMITTED" });
      return req;
    });
    setSubmittedId(created.id);
  };

  const saveDraft = () => {
    if (!form.getFieldValue("name")) return;
    mutate(() => store.create<FeatureRequest>("featureRequests", buildRequest("DRAFT")));
    setSubmittedId("DRAFT");
  };

  if (submittedId) {
    return (
      <Result
        status="success"
        title={submittedId === "DRAFT" ? "임시저장 완료" : `Feature Request 제출 완료 (${submittedId})`}
        subTitle={submittedId === "DRAFT" ? "작성 중인 제안서를 임시저장했습니다." : "DRAFT → SUBMITTED 전이됨. PMO가 Intake Review Board에서 검토합니다."}
        extra={[
          <Link key="intake" to="/intake"><Button type="primary">Intake Review Board로</Button></Link>,
          <Button key="again" onClick={() => { setSubmittedId(null); setStep(0); form.resetFields(); setApplyScope({}); setRelatedDepts([]); setExecDirective(false); }}>새 제안 작성</Button>,
        ]}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Feature 신규 등록" subtitle="UI-001 · 제안서 3-Step 등록" icon="📝" extra={<span style={{ color: "#fff", fontWeight: 600 }}>Step {step + 1} of 3</span>} />
      <DataQualityBanner />

      <Steps current={step} style={{ marginBottom: 20, maxWidth: 720 }} items={[{ title: "제안 개요·배경" }, { title: "기술 개요·운영안" }, { title: "유관부서·경영층" }]} />

      <Form form={form} layout="vertical" disabled={!allowed} initialValues={{ deployType: "Binary OTA" }} requiredMark>
        {/* ── Step 1: 제안 개요 & 배경 ── */}
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <Card title="제안 개요" style={{ marginBottom: 16 }}>
            <Form.Item name="name" label="Feature 제안명" rules={[{ required: true, message: "제안명은 필수입니다." }]}>
              <Input placeholder="제안명을 입력하세요." size="large" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={10}>
                <Form.Item name="department" label="제안 부서">
                  <Select placeholder="Team" options={TEAMS.map((t) => ({ value: t, label: t }))} allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} md={14}>
                <Form.Item name="requester" label="담당자">
                  <Input placeholder="담당자 이름을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="제안 배경">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="고객 니즈" required tooltip="근거 자료 유형 선택 후 작성">
                  <Segmented size="small" options={NEEDS_SOURCES} value={needsSource} onChange={(v) => setNeedsSource(v as string)} style={{ marginBottom: 8 }} />
                  <Form.Item name="customerNeeds" noStyle rules={[{ required: true, message: "고객 니즈는 필수입니다." }]}>
                    <Input.TextArea rows={4} placeholder={"- IQS, VDS 및 NCBS 기반 Back-up Data\n- MI 또는 타 기관 시장 조사 기반 고객 니즈 Data"} />
                  </Form.Item>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="reviewBackground" label="검토 배경">
                  <Input.TextArea rows={5} placeholder={"- 시장 및 기술 동향\n- 법규 제정 등 관련 법규 기반 동향"} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="devAgreement" label="개발 협의">
                  <Input.TextArea rows={3} placeholder="AVP 개발 부문과의 사전 개발 Feasibility 검토 협의 결과" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="expectedValue" label="기대효과">
                  <Input.TextArea rows={3} placeholder="상품성, 수익성, 안전성, 기타 고객 가치 등 다양한 관점(가능한 구체적 수치 제시)" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>

        {/* ── Step 2: 기술 개요 & 운영안 ── */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card title="기술 개요" style={{ height: "100%" }}>
                <Form.Item name="techConcept" label="기술 컨셉">
                  <Input.TextArea rows={4} placeholder={"- 기술에 대한 정의, 기능, 시스템 구성, 사용 목적 등 기술 컨셉 상세 기술\n- 적용 조건: 필수 HW, SW, 제어 등 가능한 범위까지 서술"} />
                </Form.Item>
                <Form.Item name="useCase" label="유즈케이스">
                  <Input.TextArea rows={4} placeholder="본 기능을 사용하게 되는 상황, 주변 환경 등" />
                </Form.Item>
                <Form.Item name="competitorTrend" label="경쟁사 동향">
                  <Input.TextArea rows={3} placeholder="동종/이종 산업 내 유사 신기술 동향" />
                </Form.Item>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="운영안" style={{ height: "100%" }}>
                <Form.Item name="regionScopeNote" label="권역 협의 범위">
                  <Input.TextArea rows={3} placeholder="국내, 북미, 유럽, 중국, 일반 등 협의된 권역 표시 및 근거 자료 별도 첨부" />
                </Form.Item>
                <Form.Item label="적용 범위 (권역 × 브랜드)">
                  <ScopeMatrix value={applyScope} onChange={setApplyScope} />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={14}>
                    <Form.Item name="desiredVehicle" label="희망 차종">
                      <Input placeholder="적용 희망 차종" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="deployType" label="Deploy Type">
                      <Select options={["Binary OTA", "Policy-only", "Hybrid"].map((v) => ({ value: v, label: v }))} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </div>

        {/* ── Step 3: 유관 부서 & 경영층 지시사항 ── */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          <Card title="유관 부서" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>협의·검토가 필요한 유관 부서를 선택하세요.</div>
            <Space wrap>
              {RELATED_DEPTS.map((d) => {
                const on = relatedDepts.includes(d);
                return (
                  <Button key={d} onClick={() => setRelatedDepts((p) => (on ? p.filter((x) => x !== d) : [...p, d]))} style={on ? { background: "#1f4e78", borderColor: "#1f4e78", color: "#fff" } : {}}>
                    {d}
                  </Button>
                );
              })}
            </Space>
          </Card>
          <Card title="경영층 지시사항">
            <Space align="center" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>경영층 지시사항 여부</span>
              <Switch checked={execDirective} onChange={setExecDirective} checkedChildren="Y" unCheckedChildren="N" />
            </Space>
            {execDirective && (
              <Form.Item name="execDirectiveNote" label="지시 내용" rules={[{ required: true, message: "지시 내용을 입력하세요." }]}>
                <Input.TextArea rows={3} placeholder="경영층 지시사항 내용 및 출처/일자" />
              </Form.Item>
            )}
            {!execDirective && <div style={{ fontSize: 13, color: "#94a3b8" }}>해당 없음 — 일반 제안으로 접수됩니다.</div>}
          </Card>
        </div>

        {/* ── 네비게이션 ── */}
        <Space style={{ marginTop: 20 }}>
          {step > 0 && <Button icon={<ArrowLeftOutlined />} onClick={() => setStep((s) => s - 1)}>이전</Button>}
          {step < 2 && <Button type="primary" onClick={next}>다음 <ArrowRightOutlined /></Button>}
          {step === 2 && <Button type="primary" onClick={onSubmit} disabled={!allowed}>제안 제출</Button>}
          <Button onClick={saveDraft} disabled={!allowed}>임시저장</Button>
        </Space>
      </Form>
    </div>
  );
}
