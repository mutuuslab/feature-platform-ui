// 공용: 그라디언트 PageHeader / DataQualityBanner / ConfirmationModal / LifecycleStatusStepper
import type { ReactNode } from "react";
import { Alert, Modal } from "antd";
import type { LifecycleStatus } from "../domain/types";
import { LifecyclePipeline } from "./viz/GateViz";

// 그라디언트 페이지 헤더 배너 (아이콘 + 타이틀 + 서브 + 우측 슬롯)
export function PageHeader({
  title,
  subtitle,
  icon = "◆",
  extra,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="fp-pagehead fp-rise">
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
        <div className="fp-ph-icon">{icon}</div>
        <div style={{ flex: 1 }}>
          <div className="fp-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          {subtitle && <div style={{ opacity: 0.82, fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}

// CMP-013 — Mock 데이터/신선도 배너
export function DataQualityBanner({ lastUpdated = "2026-06-09 09:00" }: { lastUpdated?: string }) {
  return (
    <Alert
      type="info"
      showIcon
      message={`Mock 데이터 모드 · Source: in-memory store · last sync ${lastUpdated} — 실서버 연동 시 dataProvider만 교체`}
      style={{ marginBottom: 16, borderRadius: 12 }}
    />
  );
}

// CMP-014 — 고위험 결정 확인
export function confirmDecision(opts: {
  title: string;
  content: ReactNode;
  onOk: () => void | Promise<void>;
  okText?: string;
  danger?: boolean;
}) {
  Modal.confirm({
    title: opts.title,
    content: opts.content,
    okText: opts.okText ?? "확인",
    cancelText: "취소",
    okButtonProps: { danger: opts.danger },
    onOk: opts.onOk,
  });
}

// CMP-002 — Lifecycle Status Stepper (시각 펑넬로 대체)
export function LifecycleStatusStepper({ current }: { current: LifecycleStatus }) {
  return <LifecyclePipeline current={current} />;
}
