import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ROLES, type RoleId } from "./rbac";

interface RoleContextValue {
  role: RoleId;
  roleLabel: string;
  userName: string;
  setRole: (r: RoleId) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const USER_BY_ROLE: Record<RoleId, string> = {
  Requester: "K. Requester",
  PMO: "J. PMO",
  ProductOwner: "P. Product",
  SystemOwner: "S. System",
  SWOwner: "W. Software",
  Supplier: "Acme Supplier",
  ReleaseOwner: "R. Release",
  OperationOwner: "O. Operations",
  Quality: "Q. Quality",
  Admin: "Admin",
};

export function RoleProvider({ children, initialRole = "PMO" }: { children: ReactNode; initialRole?: RoleId }) {
  const [role, setRole] = useState<RoleId>(initialRole);
  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      roleLabel: ROLES.find((r) => r.id === role)?.label ?? role,
      userName: USER_BY_ROLE[role],
      setRole,
    }),
    [role],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
