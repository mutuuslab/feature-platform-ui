// CMP-001 AppShell — Mission-Control 셸 + 역할 기반 그룹 네비게이션 (시트 35, 23).
import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Layout, Menu, Select, Tag, Tooltip, Typography } from "antd";
import { BulbOutlined, LogoutOutlined, MoonOutlined } from "@ant-design/icons";
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
const { Text } = Typography;

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={252} className="fp-sider" trigger={null}>
        <div className="fp-brand">
          <div className="fp-brand-mark">FP</div>
          {!collapsed && (
            <div style={{ lineHeight: 1.1 }}>
              <div className="fp-display" style={{ fontWeight: 700, fontSize: 15 }}>Feature Platform</div>
              <div style={{ fontSize: 10, color: "#7fb6d6", letterSpacing: 1 }}>LIFECYCLE GOVERNANCE</div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openGroup ? [openGroup] : []}
          style={{ marginTop: 4, paddingBottom: 24 }}
          items={groups.map((g) => ({
            key: g.key,
            label: g.label,
            type: "group",
            children: g.items.map((n) => ({ key: n.key, icon: n.icon, label: <Link to={n.key}>{n.label}</Link> })),
          }))}
        />
      </Sider>
      <Layout>
        <Header className="fp-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 24, height: 64 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: 600, letterSpacing: 0.2 }} className="fp-display">
            <span style={{ color: tokens.color.cyanBright }}>◆</span> Vehicle Feature Lifecycle — Mission Control
          </Text>
          <Tooltip title={USE_BACKEND ? (connected ? "Node/TS 백엔드 연결됨" : "백엔드 연결 시도 중/실패 — Mock 사용") : "인메모리 Mock 모드 (VITE_API_URL 설정 시 백엔드 연결)"}>
            <Tag bordered={false} style={{ background: connected ? "rgba(21,128,61,0.2)" : "rgba(255,255,255,0.08)", color: connected ? "#86efac" : "#7fb6d6", marginRight: 8 }}>
              <span className="fp-dot" style={{ background: connected ? "#22c55e" : "#94a3b8" }} />{connected ? "Backend" : "Mock"}
            </Tag>
          </Tooltip>
          <Tooltip title={dark ? "라이트 모드" : "다크 모드"}>
            <Button type="text" shape="circle" icon={dark ? <BulbOutlined style={{ color: "#fde047" }} /> : <MoonOutlined style={{ color: "#cfe0ec" }} />} onClick={toggle} style={{ marginRight: 8 }} />
          </Tooltip>
          <div className="fp-role-pill">
            <span style={{ color: "#7fb6d6", fontSize: 12 }}>VIEW AS</span>
            <Select
              size="small"
              variant="borderless"
              value={role}
              style={{ width: 210 }}
              popupMatchSelectWidth={260}
              onChange={onRoleChange}
              options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
            />
            <Tag bordered={false} style={{ background: "rgba(34,211,238,0.15)", color: "#7fdfef", margin: 0 }}>{allItems.length} screens</Tag>
            <Avatar size={28} style={{ background: tokens.gradient.cyan, fontSize: 12, fontWeight: 700 }}>
              {userName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </Avatar>
          </div>
          <Tooltip title="로그아웃">
            <Button type="text" shape="circle" icon={<LogoutOutlined style={{ color: "#cfe0ec" }} />} onClick={logout} style={{ marginLeft: 8 }} />
          </Tooltip>
        </Header>
        <Content className="fp-canvas">
          <div style={{ maxWidth: tokens.layout.contentMaxWidth, margin: "0 auto", padding: 24 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
