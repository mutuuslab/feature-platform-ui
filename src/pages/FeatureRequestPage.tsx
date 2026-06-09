// UI-001 Feature Request — 3-Step 제안서 등록 위저드 + AI 작성 도우미
// AI: 초안 자동 보강 · 완성도 검토 · 중복 탐지 · 제출 전 요약 (Mock, 백엔드 연결 시 실제 Claude)
// + Draft 이어쓰기/중복방지 · 근거 자료 첨부 · 현실형 운영안(양산 SOP·적용 차급·과금 모델·예상 대수)
import { useMemo, useRef, useState } from "react";
import {
  Alert, App, Button, Card, Col, Drawer, Form, Input, InputNumber, List, Progress, Result,
  Row, Segmented, Select, Space, Spin, Steps, Switch, Tag, Tooltip, Typography, Upload,
} from "antd";
import {
  ArrowRightOutlined, ArrowLeftOutlined, ThunderboltOutlined, RobotOutlined,
  FileSearchOutlined, SafetyCertificateOutlined, BulbOutlined, UploadOutlined,
} from "@ant-design/icons";
import { Link } from "react-router";
import { store, useList, useMutate } from "../data/useStore";
import type { AttachmentMeta, Feature, FeatureRequest } from "../domain/types";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { useRole } from "../auth/RoleContext";
import {
  aiDraft, aiReview, aiDedup, aiSummarize, aiMode,
  type ReviewResult, type DedupResult, type SummarizeResult,
} from "../data/aiProvider";

const { Text, Paragraph } = Typography;

const TEAMS = ["ADAS팀", "Connectivity팀", "Powertrain팀", "Body/Chassis팀", "Infotainment팀", "기획팀"];
const NEEDS_SOURCES = ["품질대외지수", "Tracking 자료", "기획조사 자료"];
const RELATED_DEPTS = ["Product", "System", "SW", "Release", "Operation", "AVP 개발", "MI", "기획", "품질", "구매", "Safety/Security"];
const REGIONS = ["국내", "북미", "유럽", "중국", "일반"];
const BRANDS = ["현대", "기아", "제네시스"];
// ── 현실형 운영안 옵션 ──
const SEGMENTS = ["경차/소형", "준중형", "중형", "대형/플래그십", "SUV/RV", "EV 전용", "상용/PBV"];
const SOP_OPTIONS = ["'26 4Q", "'27 1Q", "'27 2Q", "'27 4Q", "'28 MY", "'29 MY", "미정"];
const BIZ_MODELS = ["기본 탑재", "유상 옵션", "구독 (Subscription)", "FoD (Feature on Demand)"];

// 필드 → 위저드 step 매핑 (검토 결과에서 해당 step으로 점프)
const STEP_OF_FIELD: Record<string, number> = {
  name: 0, department: 0, requester: 0, customerNeeds: 0, reviewBackground: 0, devAgreement: 0, expectedValue: 0,
  techConcept: 1, useCase: 1, competitorTrend: 1, regionScopeNote: 1, desiredVehicle: 1, deployType: 1,
  applyScope: 1, applySegments: 1, targetSOP: 1, businessModel: 1, volumeEstimate: 1,
  relatedDepts: 2, execDirectiveNote: 2,
};

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

// 다중 토글 칩 (적용 차급 등)
function ChipToggle({ options, value, onChange, onColor = "#1f4e78" }: { options: string[]; value: string[]; onChange: (v: string[]) => void; onColor?: string }) {
  return (
    <Space wrap size={6}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <Button key={o} size="small" onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} style={on ? { background: onColor, borderColor: onColor, color: "#fff", fontWeight: 600 } : {}}>
            {o}
          </Button>
        );
      })}
    </Space>
  );
}

const STEP_FIELDS: string[][] = [
  ["name", "department", "requester", "customerNeeds", "reviewBackground", "devAgreement", "expectedValue"],
  ["techConcept", "useCase", "competitorTrend", "regionScopeNote", "desiredVehicle", "deployType", "targetSOP", "businessModel", "volumeEstimate"],
  ["execDirectiveNote"],
];

export function FeatureRequestPage() {
  const [form] = Form.useForm();
  const mutate = useMutate();
  const { message } = App.useApp();
  const { userName } = useRole();
  const allowed = true; // 데모(test): 역할 무관하게 누구나 작성 가능

  const [step, setStep] = useState(0);
  const [needsSource, setNeedsSource] = useState(NEEDS_SOURCES[0]);
  const [applyScope, setApplyScope] = useState<Record<string, string[]>>({});
  const [applySegments, setApplySegments] = useState<string[]>([]);
  const [relatedDepts, setRelatedDepts] = useState<string[]>([]);
  const [execDirective, setExecDirective] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [draftId, setDraftIdState] = useState<string | null>(null); // 이어쓰기 중인 임시저장 ID (렌더용)
  const draftIdRef = useRef<string | null>(null); // 동기 판단용 — 빠른 연속 클릭에도 중복 생성 방지
  const setDraft = (id: string | null) => { draftIdRef.current = id; setDraftIdState(id); };

  // ── AI 어시스트 상태 ──
  const [aiIdea, setAiIdea] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [summary, setSummary] = useState<SummarizeResult | null>(null);
  const [dedupBusy, setDedupBusy] = useState(false);
  const [dedup, setDedup] = useState<DedupResult | null>(null);
  const mode = aiMode();

  // 이어쓰기 가능한 임시저장 목록
  const drafts = useList<FeatureRequest>("featureRequests").filter((r) => r.status === "DRAFT");

  const next = async () => {
    try {
      await form.validateFields(STEP_FIELDS[step]);
      setStep((s) => Math.min(s + 1, 2));
    } catch {
      /* 검증 실패 시 머무름 */
    }
  };

  // 현재 폼 값 + 비-폼 상태를 합친 평면 객체 (AI 검토/요약/중복 입력용)
  const collect = (): Record<string, unknown> => {
    const v = form.getFieldsValue(true);
    return { ...v, needsSource, applyScope, applySegments, relatedDepts, execDirective, attachments };
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
      applySegments,
      targetSOP: v.targetSOP,
      businessModel: v.businessModel,
      volumeEstimate: v.volumeEstimate != null ? String(v.volumeEstimate) : undefined,
      desiredVehicle: v.desiredVehicle,
      relatedDepts,
      execDirective,
      execDirectiveNote: execDirective ? v.execDirectiveNote : undefined,
      attachments,
    } as FeatureRequest;
  };

  // 임시저장본 불러오기 (이어쓰기)
  const loadDraft = (r: FeatureRequest) => {
    form.setFieldsValue({
      name: r.name, department: r.department, requester: r.requester,
      customerNeeds: r.customerNeeds, reviewBackground: r.reviewBackground, devAgreement: r.devAgreement, expectedValue: r.expectedValue,
      techConcept: r.techConcept, useCase: r.useCase, competitorTrend: r.competitorTrend,
      regionScopeNote: r.regionScopeNote, desiredVehicle: r.desiredVehicle, deployType: r.deployType,
      targetSOP: r.targetSOP, businessModel: r.businessModel, volumeEstimate: r.volumeEstimate ? Number(r.volumeEstimate) : undefined,
      execDirectiveNote: r.execDirectiveNote,
    });
    setNeedsSource(r.needsSource ?? NEEDS_SOURCES[0]);
    setApplyScope(r.applyScope ?? {});
    setApplySegments(r.applySegments ?? []);
    setRelatedDepts(r.relatedDepts ?? []);
    setExecDirective(Boolean(r.execDirective));
    setAttachments(r.attachments ?? []);
    setDraft(r.id);
    setStep(0);
    message.success(`임시저장본 ${r.id} 을(를) 불러왔습니다. 이어서 작성하세요.`);
  };

  // ── AI: 초안 자동 보강 ──
  const runDraft = async () => {
    const name = form.getFieldValue("name") || aiIdea.trim();
    if (!name) {
      message.warning("제안명 또는 아이디어 한 줄을 먼저 입력하세요.");
      return;
    }
    setDraftBusy(true);
    try {
      const d = await aiDraft({ name, idea: aiIdea.trim() || name, needsSource });
      form.setFieldsValue({
        name: form.getFieldValue("name") || (aiIdea.trim() ? name : undefined),
        customerNeeds: d.customerNeeds,
        reviewBackground: d.reviewBackground,
        devAgreement: d.devAgreement,
        expectedValue: d.expectedValue,
        techConcept: d.techConcept,
        useCase: d.useCase,
        competitorTrend: d.competitorTrend,
      });
      message.success(`AI가 제안서 초안을 채웠습니다 (${mode === "claude" ? "Claude" : "데모"}). 내용을 검토·수정하세요.`);
    } catch (e) {
      message.error(`초안 생성 실패: ${(e as Error).message}`);
    } finally {
      setDraftBusy(false);
    }
  };

  // ── AI: 완성도 검토 + 요약 ──
  const runReview = async () => {
    setReviewOpen(true);
    setReviewBusy(true);
    setReview(null);
    setSummary(null);
    try {
      const request = collect();
      const [r, s] = await Promise.all([aiReview({ request }), aiSummarize({ request })]);
      setReview(r);
      setSummary(s);
    } catch (e) {
      message.error(`검토 실패: ${(e as Error).message}`);
    } finally {
      setReviewBusy(false);
    }
  };

  // ── AI: 중복 Feature 탐지 ──
  const runDedup = async () => {
    const name = form.getFieldValue("name") || aiIdea.trim();
    if (!name) {
      message.warning("제안명을 먼저 입력하세요.");
      return;
    }
    setDedupBusy(true);
    try {
      const features = store.list<Feature>("features").map((f) => ({ id: f.id, name: f.name, kind: "등록 Feature" }));
      const reqs = store.list<FeatureRequest>("featureRequests").filter((r) => r.id !== draftIdRef.current).map((r) => ({ id: r.id, name: r.name, kind: "기존 제안" }));
      const res = await aiDedup({ name, idea: aiIdea.trim(), existing: [...features, ...reqs] });
      setDedup(res);
      if (res.verdict === "NO_DUPLICATE") message.success("유사/중복 후보가 없습니다.");
    } catch (e) {
      message.error(`중복 탐지 실패: ${(e as Error).message}`);
    } finally {
      setDedupBusy(false);
    }
  };

  // 임시저장 — 이어쓰기 중이면 갱신(update), 처음이면 생성(create). 중복 레코드 방지.
  const saveDraft = () => {
    if (!form.getFieldValue("name")) {
      message.warning("제안명을 입력한 뒤 임시저장할 수 있습니다.");
      return;
    }
    const payload = buildRequest("DRAFT");
    const existing = draftIdRef.current;
    const id = mutate(() => {
      if (existing) {
        store.update<FeatureRequest>("featureRequests", existing, { ...payload, id: existing });
        store.audit({ actor: userName, action: "SAVE_DRAFT", objectType: "FeatureRequest", objectId: existing });
        return existing;
      }
      const created = store.create<FeatureRequest>("featureRequests", payload);
      store.audit({ actor: userName, action: "SAVE_DRAFT", objectType: "FeatureRequest", objectId: created.id, after: "DRAFT" });
      return created.id;
    });
    setDraft(id);
    message.success(existing ? `임시저장본 ${id} 을(를) 갱신했습니다.` : `임시저장했습니다 (${id}). 이어서 작성할 수 있습니다.`);
  };

  // 제출 — 이어쓰던 Draft가 있으면 그 레코드를 SUBMITTED로 전이(중복 생성 방지).
  const onSubmit = async () => {
    await form.validateFields(STEP_FIELDS.flat());
    const payload = buildRequest("SUBMITTED");
    const existing = draftIdRef.current;
    const created = mutate(() => {
      if (existing) {
        const up = store.update<FeatureRequest>("featureRequests", existing, { ...payload, id: existing });
        store.audit({ actor: userName, action: "SUBMIT_REQUEST", objectType: "FeatureRequest", objectId: existing, before: "DRAFT", after: "SUBMITTED" });
        return up;
      }
      const req = store.create<FeatureRequest>("featureRequests", payload);
      store.audit({ actor: userName, action: "SUBMIT_REQUEST", objectType: "FeatureRequest", objectId: req.id, after: "SUBMITTED" });
      return req;
    });
    setSubmittedId(created.id);
  };

  const resetAll = () => {
    setSubmittedId(null); setStep(0); form.resetFields();
    setApplyScope({}); setApplySegments([]); setRelatedDepts([]); setExecDirective(false);
    setAttachments([]); setDraft(null); setAiIdea(""); setReview(null); setSummary(null); setDedup(null);
  };

  const reviewLevelColor = useMemo(() => ({ 상: "#15803d", 중: "#d97706", 하: "#dc2626" }) as Record<string, string>, []);

  if (submittedId) {
    return (
      <Result
        status="success"
        title={`Feature Request 제출 완료 (${submittedId})`}
        subTitle="DRAFT → SUBMITTED 전이됨. PMO가 Intake Review Board에서 검토합니다."
        extra={[
          <Link key="intake" to="/intake"><Button type="primary">Intake Review Board로</Button></Link>,
          <Button key="again" onClick={resetAll}>새 제안 작성</Button>,
        ]}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Feature 신규 등록" subtitle="UI-001 · 제안서 3-Step 등록" icon="📝" extra={<span style={{ color: "#fff", fontWeight: 600 }}>Step {step + 1} of 3</span>} />
      <DataQualityBanner />

      {/* ── 임시저장 이어쓰기 ── */}
      {drafts.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={draftId ? `임시저장 ${draftId} 을(를) 이어쓰는 중입니다.` : `이어서 작성할 수 있는 임시저장 ${drafts.length}건이 있습니다.`}
          action={
            <Select
              size="small"
              style={{ width: 260 }}
              placeholder="임시저장 불러오기"
              value={draftId ?? undefined}
              options={drafts.map((d) => ({ value: d.id, label: `${d.id} · ${d.name || "(제목 없음)"}` }))}
              onChange={(id) => { const d = drafts.find((x) => x.id === id); if (d) loadDraft(d); }}
            />
          }
        />
      )}

      {/* ── AI 작성 도우미 ── */}
      <Card
        styles={{ body: { padding: 18 } }}
        style={{ marginBottom: 16, border: "none", background: "linear-gradient(110deg, #0a1f44 0%, #14457a 55%, #0e7490 100%)", color: "#fff", boxShadow: "0 8px 24px rgba(10,31,68,0.28)" }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={14}>
            <Space align="center" size={10} style={{ marginBottom: 8 }}>
              <RobotOutlined style={{ fontSize: 20, color: "#7fdfef" }} />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: 700 }} className="fp-display">AI 작성 도우미</Text>
              <Tag bordered={false} style={{ background: mode === "claude" ? "rgba(34,197,94,0.22)" : "rgba(255,255,255,0.16)", color: mode === "claude" ? "#86efac" : "#cfe7f5", margin: 0 }}>
                {mode === "claude" ? "Claude 연결됨" : "데모 모드"}
              </Tag>
            </Space>
            <div style={{ color: "#cfe7f5", fontSize: 13, marginBottom: 10 }}>
              한 줄 아이디어만 입력하면 고객 니즈·기술 컨셉·기대효과 초안을 자동으로 채워드립니다. 이후 자유롭게 수정하세요.
            </div>
            <Input
              value={aiIdea}
              onChange={(e) => setAiIdea(e.target.value)}
              onPressEnter={runDraft}
              size="large"
              placeholder='예: "주차 시 원격으로 차를 빼주는 기능"'
              prefix={<BulbOutlined style={{ color: "#94a3b8" }} />}
              allowClear
            />
          </Col>
          <Col xs={24} md={10}>
            <Space wrap>
              <Button type="primary" size="large" icon={<ThunderboltOutlined />} loading={draftBusy} onClick={runDraft} style={{ background: "#22d3ee", borderColor: "#22d3ee", color: "#06283d", fontWeight: 700 }}>
                초안 자동 생성
              </Button>
              <Tooltip title="현재 작성 내용의 완성도를 점검하고 보강 포인트를 제안합니다.">
                <Button size="large" icon={<SafetyCertificateOutlined />} onClick={runReview} style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.35)", color: "#fff" }}>
                  완성도 검토
                </Button>
              </Tooltip>
              <Tooltip title="기존 등록 Feature·제안과 중복되는지 확인합니다.">
                <Button size="large" icon={<FileSearchOutlined />} loading={dedupBusy} onClick={runDedup} style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.35)", color: "#fff" }}>
                  중복 탐지
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>

        {dedup && (
          <Alert
            style={{ marginTop: 14 }}
            type={dedup.verdict === "LIKELY_DUPLICATE" ? "error" : dedup.verdict === "REVIEW_RECOMMENDED" ? "warning" : "success"}
            showIcon
            closable
            onClose={() => setDedup(null)}
            message={
              dedup.verdict === "LIKELY_DUPLICATE" ? "중복 가능성이 높습니다 — 기존 항목과 병합/연계를 검토하세요."
              : dedup.verdict === "REVIEW_RECOMMENDED" ? "유사 항목이 있습니다 — 검토를 권장합니다."
              : "유사/중복 후보가 없습니다."
            }
            description={
              dedup.candidates.length > 0 && (
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                  {dedup.candidates.map((c) => (
                    <div key={c.id} style={{ fontSize: 13 }}>
                      <Tag color={c.similarity >= 0.6 ? "red" : c.similarity >= 0.3 ? "orange" : "default"}>{Math.round(c.similarity * 100)}%</Tag>
                      <b>{c.name}</b> <span style={{ color: "#64748b" }}>({c.kind}) — {c.reason}</span>
                    </div>
                  ))}
                </Space>
              )
            }
          />
        )}
      </Card>

      <Steps current={step} style={{ marginBottom: 20, maxWidth: 720 }} items={[{ title: "제안 개요·배경" }, { title: "기술 개요·운영안" }, { title: "유관부서·경영층" }]} />

      <Form form={form} layout="vertical" disabled={!allowed} initialValues={{ deployType: "Binary OTA", targetSOP: "미정" }} requiredMark>
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
                <Form.Item name="regionScopeNote" label="권역 협의 범위" tooltip="협의된 권역과 그 근거. 상세 근거는 아래 '근거 자료'에 첨부">
                  <Input.TextArea rows={2} placeholder="예) 국내·북미 우선 적용, 유럽은 법규 검토 후 2차 — 권역별 협의 결과 요약" />
                </Form.Item>

                <Form.Item label="적용 범위 (권역 × 브랜드)" required tooltip="최소 1개 권역×브랜드 선택">
                  <ScopeMatrix value={applyScope} onChange={setApplyScope} />
                </Form.Item>

                <Form.Item label="적용 차급/세그먼트">
                  <ChipToggle options={SEGMENTS} value={applySegments} onChange={setApplySegments} onColor="#0e7490" />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="targetSOP" label="양산 적용 목표 시기 (SOP)">
                      <Select options={SOP_OPTIONS.map((v) => ({ value: v, label: v }))} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="businessModel" label="과금 모델 (BM)">
                      <Select placeholder="수익 모델 선택" allowClear options={BIZ_MODELS.map((v) => ({ value: v, label: v }))} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={9}>
                    <Form.Item name="desiredVehicle" label="희망 차종">
                      <Input placeholder="예) 신형 그랜저, GV80" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="volumeEstimate" label="예상 적용 대수">
                      <InputNumber style={{ width: "100%" }} min={0} step={1000} addonAfter="대/년" placeholder="연간" />
                    </Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item name="deployType" label="적용 방식">
                      <Select options={["Binary OTA", "Policy-only", "Hybrid"].map((v) => ({ value: v, label: v }))} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="근거 자료 (첨부)" tooltip="고객 니즈·권역 협의·시장 조사 등 근거 자료 첨부 (데모: 파일명만 기록)">
                  <Upload
                    multiple
                    beforeUpload={(file) => {
                      setAttachments((prev) => [...prev, { uid: String(file.uid), name: file.name, size: file.size ?? 0, type: file.type }]);
                      return false; // 실제 업로드 차단 (Mock)
                    }}
                    fileList={attachments.map((a) => ({ uid: a.uid, name: a.name, size: a.size, status: "done" as const }))}
                    onRemove={(file) => setAttachments((prev) => prev.filter((a) => a.uid !== file.uid))}
                  >
                    <Button icon={<UploadOutlined />}>근거 자료 첨부</Button>
                  </Upload>
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </div>

        {/* ── Step 3: 유관 부서 & 경영층 지시사항 ── */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          <Card title="유관 부서" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>협의·검토가 필요한 유관 부서를 선택하세요.</div>
            <ChipToggle options={RELATED_DEPTS} value={relatedDepts} onChange={setRelatedDepts} />
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
        <Space style={{ marginTop: 20 }} wrap>
          {step > 0 && <Button icon={<ArrowLeftOutlined />} onClick={() => setStep((s) => s - 1)}>이전</Button>}
          {step < 2 && <Button type="primary" onClick={next}>다음 <ArrowRightOutlined /></Button>}
          {step === 2 && <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={runReview}>제출 전 검토</Button>}
          {step === 2 && <Button type="primary" onClick={onSubmit} disabled={!allowed}>제안 제출</Button>}
          <Button onClick={saveDraft} disabled={!allowed}>임시저장</Button>
        </Space>
      </Form>

      {/* ── AI 검토 결과 Drawer ── */}
      <Drawer
        title={<Space><SafetyCertificateOutlined style={{ color: "#0e7490" }} /> AI 완성도 검토 {mode === "claude" ? <Tag color="green">Claude</Tag> : <Tag>데모</Tag>}</Space>}
        width={Math.min(480, typeof window !== "undefined" ? window.innerWidth : 480)}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      >
        {reviewBusy && (
          <div style={{ display: "grid", placeItems: "center", minHeight: 200 }}>
            <Spin tip="AI가 제안서를 검토 중…"><div style={{ padding: 40 }} /></Spin>
          </div>
        )}
        {!reviewBusy && review && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card styles={{ body: { padding: 16 } }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <Progress type="dashboard" size={92} percent={review.score} strokeColor={reviewLevelColor[review.level]} format={(p) => <span style={{ fontSize: 18, fontWeight: 700 }}>{p}</span>} />
                </Col>
                <Col flex="auto">
                  <Text strong style={{ fontSize: 15 }}>완성도 {review.level}</Text>
                  <Paragraph style={{ marginBottom: 0, color: "#475569" }}>{review.oneLine}</Paragraph>
                </Col>
              </Row>
            </Card>

            {review.strengths.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, letterSpacing: 1 }}>강점</Text>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#15803d" }}>
                  {review.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {review.suggestions.length > 0 ? (
              <div>
                <Text type="secondary" style={{ fontSize: 12, letterSpacing: 1 }}>보강 제안</Text>
                <List
                  size="small"
                  dataSource={review.suggestions}
                  renderItem={(s) => (
                    <List.Item
                      actions={[
                        <Button key="go" type="link" size="small" onClick={() => { setStep(STEP_OF_FIELD[s.field] ?? 0); setReviewOpen(false); }}>이동</Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={<Space><Tag color={s.severity === "필수" ? "red" : "blue"}>{s.severity}</Tag>{s.label}</Space>}
                        description={s.advice}
                      />
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <Alert type="success" showIcon message="보강할 항목이 없습니다. 제출 준비 완료!" />
            )}

            {summary && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, letterSpacing: 1 }}>Intake용 요약</Text>
                <Card size="small" style={{ marginTop: 6, background: "#f8fafc" }}>
                  <Paragraph style={{ marginBottom: 8 }}>{summary.summary}</Paragraph>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 13 }}>
                    {summary.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </Card>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
