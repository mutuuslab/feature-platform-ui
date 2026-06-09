// 로그인 화면 — Mission Control 브랜드 게이트 (데모 계정 admin/admin)
import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState(false);

  const onFinish = (v: { id: string; pw: string }) => {
    if (!login(v.id, v.pw)) setError(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--grad-chrome, linear-gradient(165deg,#0a1f44,#122e5a))", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(600px 300px at 80% -10%, rgba(34,211,238,0.25), transparent 70%), radial-gradient(500px 300px at 10% 110%, rgba(99,102,241,0.25), transparent 70%)" }} />
      <div className="fp-rise" style={{ position: "relative", width: 380, maxWidth: "90vw", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: "32px 28px", backdropFilter: "blur(12px)", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div className="fp-brand-mark" style={{ width: 44, height: 44, fontSize: 18 }}>FP</div>
          <div>
            <div className="fp-display" style={{ color: "#fff", fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>Feature Platform</div>
            <div style={{ color: "#7fb6d6", fontSize: 11, letterSpacing: 1 }}>LIFECYCLE GOVERNANCE</div>
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} onValuesChange={() => error && setError(false)}>
          <Form.Item name="id" rules={[{ required: true, message: "ID를 입력하세요" }]}>
            <Input size="large" prefix={<UserOutlined style={{ color: "#7fb6d6" }} />} placeholder="ID" autoFocus />
          </Form.Item>
          <Form.Item name="pw" rules={[{ required: true, message: "Password를 입력하세요" }]}>
            <Input.Password size="large" prefix={<LockOutlined style={{ color: "#7fb6d6" }} />} placeholder="Password" />
          </Form.Item>
          {error && <Alert type="error" showIcon message="ID 또는 Password가 올바르지 않습니다." style={{ marginBottom: 12 }} />}
          <Button type="primary" htmlType="submit" size="large" block style={{ background: "var(--grad-cyan, linear-gradient(135deg,#0891b2,#22d3ee))", border: "none", fontWeight: 600 }}>
            로그인
          </Button>
        </Form>
      </div>
      <div style={{ position: "absolute", bottom: 16, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Vehicle Feature Lifecycle — Mission Control · Demo</div>
    </div>
  );
}
