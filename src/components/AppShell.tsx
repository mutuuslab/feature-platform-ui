// CMP-001 AppShell — 라이트 엔터프라이즈 셸 + 역할 기반 그룹 네비게이션 (시트 35, 23).
import { Suspense, useEffect, useMemo, useState } from "react";
import { Avatar, Breadcrumb, Button, Input, Layout, Menu, Select, Spin, Tag, Tooltip } from "antd";
import { BulbOutlined, LogoutOutlined, MoonOutlined, SearchOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { ROLES } from "../auth/rbac";
import { useRole } from "../auth/RoleContext";
import { useAuth } from "../auth/AuthContext";
import { useConnected } from "../data/useStore";
import { USE_BACKEND } from "../data/apiConfig";
import { landingForRole, navForRole } from "../auth/nav";
import { useTheme } from "../theme/ThemeContext";
import { tokens } from "../theme/tokens";

const { Header, Sider, Content } = Layout;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, roleLabel, userName, setRole } = useRole();
  const { dark, toggle } = useTheme();
  const { logout } = useAuth();
  const connected = useConnected();

  const groups = useMemo(() => navForRole(role), [role]);
  const allItems = groups.flatMap((g) => g.items);

  const selectedKey =
    allItems.map((n) => n.key)
      .filter((k) => k !== "/" && location.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? "/";
  const openGroup = groups.find((g) => g.items.some((i) => i.key === selectedKey))?.key;

  const [query, setQuery] = useState("");
  // 기본은 전 그룹 펼침(발견성) — 사용자가 섹션을 접을 수 있고, 검색으로 빠르게 찾는다.
  const [openKeys, setOpenKeys] = useState<string[]>(() => groups.map((g) => g.key));

  // 역할 전환 시 전체 펼침으로 리셋
  useEffect(() => {
    setOpenKeys(groups.map((g) => g.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // 라우트 변경 시 활성 그룹은 펼쳐두기 (사용자가 접었던 경우 보장)
  useEffect(() => {
    if (openGroup) setOpenKeys((k) => (k.includes(openGroup) ? k : [...k, openGroup]));
  }, [openGroup]);

  const q = query.trim().toLowerCase();
  const menuItems = q
    ? allItems
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => ({ key: n.key, icon: n.icon, label: <Link to={n.key}>{n.label}</Link> }))
    : groups.map((g) => ({
        key: g.key,
        label: g.label,
        children: g.items.map((n) => ({ key: n.key, icon: n.icon, label: <Link to={n.key}>{n.label}</Link> })),
      }));

  // 역할 전환 시 해당 역할이 접근 불가한 화면이면 역할 랜딩으로 이동
  const onRoleChange = (next: typeof role) => {
    setRole(next);
    const nextItems = navForRole(next).flatMap((g) => g.items.map((i) => i.key));
    const stillVisible = nextItems.some((k) => (k === "/" ? location.pathname === "/" : location.pathname.startsWith(k)));
    if (!stillVisible) navigate(landingForRole(next));
  };

  useEffect(() => {
    document.title = `Feature Platform · ${roleLabel}`;
  }, [roleLabel]);

  // 헤더 브레드크럼
  const activeItem = allItems.find((i) => i.key === selectedKey);
  const activeGroup = groups.find((g) => g.items.some((i) => i.key === selectedKey));
  const crumbs = [
    { title: <Link to="/">Home</Link> },
    ...(activeGroup ? [{ title: activeGroup.label }] : []),
    ...(activeItem ? [{ title: activeItem.label }] : []),
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={252} className="fp-sider" trigger={null}>
        <div className="fp-brand">
          <div className="fp-brand-mark">FP</div>
          <div style={{ lineHeight: 1.1 }}>
            <div className="fp-display" style={{ fontWeight: 700, fontSize: 15, color: "var(--chrome-text-active)" }}>Feature Platform</div>
            <div style={{ fontSize: 10, color: "var(--chrome-text-dim)", letterSpacing: 1 }}>LIFECYCLE GOVERNANCE</div>
          </div>
        </div>
        <div className="fp-nav-search">
          <Input
            allowClear
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            prefix={<SearchOutlined style={{ color: "var(--chrome-text-dim)" }} />}
            placeholder="화면 검색…"
          />
        </div>
        <Menu
          theme={dark ? "dark" : "light"}
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={q ? [] : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          style={{ paddingBottom: 24, borderInlineEnd: "none" }}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="fp-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 24, height: 64 }}>
          <Breadcrumb className="fp-breadcrumb" items={crumbs} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <Tooltip title={USE_BACKEND ? (connected ? "Node/TS 백엔드 연결됨" : "백엔드 연결 시도 중/실패 — Mock 사용") : "인메모리 Mock 모드 (VITE_API_URL 설정 시 백엔드 연결)"}>
              <Tag bordered={false} style={{ background: connected ? "#dcfce7" : "#f1f5f9", color: connected ? "#15803d" : "#64748b", marginRight: 8 }}>
                <span className="fp-dot" style={{ background: connected ? "#22c55e" : "#94a3b8" }} />{connected ? "Backend" : "Mock"}
              </Tag>
            </Tooltip>
            <Tooltip title={dark ? "라이트 모드" : "다크 모드"}>
              <Button type="text" shape="circle" icon={dark ? <BulbOutlined style={{ color: "#fbbf24" }} /> : <MoonOutlined style={{ color: "var(--chrome-text)" }} />} onClick={toggle} style={{ marginRight: 8 }} />
            </Tooltip>
            <div className="fp-role-pill">
              <span style={{ color: "var(--chrome-text-dim)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>VIEW AS</span>
              <Select
                size="small"
                variant="borderless"
                value={role}
                style={{ width: 210 }}
                popupMatchSelectWidth={260}
                onChange={onRoleChange}
                options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
              />
              <Tag bordered={false} style={{ background: "#eef3f9", color: "#1f4e78", margin: 0 }}>{allItems.length} screens</Tag>
              <Avatar size={28} style={{ background: tokens.gradient.cyan, fontSize: 12, fontWeight: 700 }}>
                {userName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </Avatar>
            </div>
            <Tooltip title="로그아웃">
              <Button type="text" shape="circle" icon={<LogoutOutlined style={{ color: "var(--chrome-text)" }} />} onClick={logout} style={{ marginLeft: 8 }} />
            </Tooltip>
          </div>
        </Header>
        <Content className="fp-canvas">
          <div style={{ maxWidth: tokens.layout.contentMaxWidth, margin: "0 auto", padding: 24 }}>
            <Suspense fallback={<div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}><Spin size="large" tip="로딩 중…"><div style={{ padding: 50 }} /></Spin></div>}>
              <Outlet />
            </Suspense>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
