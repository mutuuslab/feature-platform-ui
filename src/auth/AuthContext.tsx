// 데모 로그인 게이트 (클라이언트 전용, admin/admin). 실제 보안 아님 — PoC 데모용.
import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthCtx {
  authed: boolean;
  user: string;
  login: (id: string, pw: string) => boolean;
  logout: () => void;
}

// Provider가 없어도 안전한 기본값 (테스트에서 AppShell 단독 렌더 대비)
const Ctx = createContext<AuthCtx>({ authed: false, user: "", login: () => false, logout: () => {} });

const KEY = "fp-auth-user";
const DEMO_ID = "admin";
const DEMO_PW = "admin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string>(() => localStorage.getItem(KEY) ?? "");
  const login = (id: string, pw: string) => {
    if (id.trim() === DEMO_ID && pw === DEMO_PW) {
      localStorage.setItem(KEY, id.trim());
      setUser(id.trim());
      return true;
    }
    return false;
  };
  const logout = () => {
    localStorage.removeItem(KEY);
    setUser("");
  };
  return <Ctx.Provider value={{ authed: Boolean(user), user, login, logout }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(Ctx);
}
