// 도메인 워크벤치 — 탭 기반 + 행 클릭 시 상세 드릴다운 Drawer (Depth).
import { useState, type ReactNode } from "react";
import { Alert, Card, Descriptions, Divider, Drawer, Empty, Table, Tabs, Tag, Timeline, Tooltip } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { DataQualityBanner, PageHeader } from "./Common";
import { StatusBadge } from "./StatusBadge";

export interface WbCol {
  title: string;
  dataIndex: string;
  mono?: boolean;
  status?: boolean;
  tagColor?: string;
}

export interface WbTab {
  key: string;
  uiId: string;
  label: string;
  desc: string;
  columns: WbCol[];
  rows: Record<string, ReactNode | string | number>[];
  note?: string;
}

type Row = Record<string, ReactNode | string | number>;

function cellText(v: ReactNode | string | number): string {
  return typeof v === "string" || typeof v === "number" ? String(v) : "—";
}

// 행에서 결정적으로 파생한 상세(mock) — 모든 화면에 일관된 Depth 제공
function synthDetail(tab: WbTab, row: Row) {
  const idVal = cellText(row[tab.columns[0].dataIndex]);
  const seed = idVal.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const ver = `v${(seed % 5) + 1}.${seed % 9}`;
  const sources = ["ALM (Polarion)", "API Catalog", "Feature Registry", "OTA Platform", "Telemetry Lake", "Supplier Portal"];
  return {
    extended: {
      "Source System": sources[seed % sources.length],
      Version: ver,
      "Created": "2026-05-2" + (seed % 9),
      "Last Updated": "2026-06-0" + (seed % 9),
      "Record Owner": ["P. Product", "S. System", "W. Software", "R. Release", "O. Operations"][seed % 5],
      "Audit Trail": `AUDIT-${1000 + (seed % 8999)}`,
    } as Record<string, string>,
    history: [
      { color: "#1f4e78", label: `${idVal} 생성`, meta: "2026-05-2" + (seed % 9) + " · PMO" },
      { color: "#b45309", label: "검토 코멘트 등록 / Rework 요청", meta: "2026-06-0" + ((seed + 2) % 9) + " · Reviewer" },
      { color: "#15803d", label: "승인 / 상태 갱신", meta: "2026-06-0" + ((seed + 4) % 9) + " · Gate Owner" },
    ],
    related: [
      { type: "Feature", id: ["FEAT-RPA-001", "FEAT-ALK-002", "FEAT-DST-003"][seed % 3] },
      { type: "Gate", id: ["RG2", "RG5", "RG6", "RG8"][seed % 4] },
      { type: "Evidence", id: `EV-${100 + (seed % 80)}` },
      { type: "API", id: `API-0${(seed % 9) + 1}` },
    ],
  };
}

function WbTabContent({ tab }: { tab: WbTab }) {
  const [active, setActive] = useState<Row | null>(null);
  const detail = active ? synthDetail(tab, active) : null;
  const titleField = tab.columns[0].dataIndex;

  return (
    <Card
      className="fp-card-lift"
      title={<span><Tag className="fp-mono" color="#1f4e78">{tab.uiId}</Tag>{tab.label}</span>}
    >
      <Alert type="info" showIcon message={tab.desc} style={{ marginBottom: 16, borderRadius: 10 }} />
      {tab.rows.length ? (
        <Table
          rowKey={(_, i) => String(i)}
          dataSource={tab.rows}
          pagination={false}
          scroll={{ x: "max-content" }}
          onRow={(r) => ({ onClick: () => setActive(r as Row), style: { cursor: "pointer" } })}
          columns={[
            ...tab.columns.map((c) => ({
              title: c.title,
              dataIndex: c.dataIndex,
              render: (v: ReactNode) =>
                c.status ? <StatusBadge value={String(v)} /> : c.tagColor ? <Tag color={c.tagColor}>{v}</Tag> : c.mono ? <span className="fp-mono">{v}</span> : v,
            })),
            { title: "", width: 36, render: () => <RightOutlined style={{ color: "#94a3b8" }} /> },
          ]}
        />
      ) : (
        <Empty />
      )}
      {tab.note && <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>ⓘ {tab.note}</div>}

      <Drawer
        title={active ? <span><Tag className="fp-mono" color="#1f4e78">{tab.uiId}</Tag>{cellText(active[titleField])}</span> : ""}
        width={620}
        open={!!active}
        onClose={() => setActive(null)}
      >
        {active && detail && (
          <Tabs
            items={[
              {
                key: "detail",
                label: "상세",
                children: (
                  <>
                    <Descriptions column={1} size="small" bordered>
                      {tab.columns.map((c) => (
                        <Descriptions.Item key={c.dataIndex} label={c.title}>
                          {c.status ? <StatusBadge value={cellText(active[c.dataIndex])} /> : <span className={c.mono ? "fp-mono" : ""}>{cellText(active[c.dataIndex])}</span>}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                    <Divider orientation="left" style={{ fontSize: 13 }}>Drill-down 속성</Divider>
                    <Descriptions column={2} size="small" bordered>
                      {Object.entries(detail.extended).map(([k, v]) => (
                        <Descriptions.Item key={k} label={k}><span className="fp-mono">{v}</span></Descriptions.Item>
                      ))}
                    </Descriptions>
                  </>
                ),
              },
              {
                key: "history",
                label: "변경/승인 이력",
                children: (
                  <Timeline
                    items={detail.history.map((h) => ({
                      color: h.color,
                      children: <div><strong>{h.label}</strong><div style={{ fontSize: 12, color: "#64748b" }}>{h.meta}</div></div>,
                    }))}
                  />
                ),
              },
              {
                key: "related",
                label: "연결 항목 (Traceability)",
                children: (
                  <Descriptions column={1} size="small" bordered>
                    {detail.related.map((r) => (
                      <Descriptions.Item key={r.type} label={r.type}><Tag className="fp-mono" color="#0891b2">{r.id}</Tag></Descriptions.Item>
                    ))}
                  </Descriptions>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </Card>
  );
}

export function Workbench({
  title,
  subtitle,
  icon,
  tabs,
  customTabs,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tabs: WbTab[];
  customTabs?: { key: string; label: ReactNode; children: ReactNode }[];
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} icon={icon} />
      <DataQualityBanner />
      <Tabs
        items={[
          ...(customTabs ?? []).map((c) => ({ key: c.key, label: c.label, children: c.children })),
          ...tabs.map((t) => ({
            key: t.key,
            label: <Tooltip title={`${t.uiId} · 행 클릭 시 상세`}><span>{t.label}</span></Tooltip>,
            children: <WbTabContent tab={t} />,
          })),
        ]}
      />
    </div>
  );
}
