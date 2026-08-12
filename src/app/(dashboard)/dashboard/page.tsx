"use client";

import { useEffect } from "react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleView } from "@/components/auth/RoleGuard";
import AdminDashboardView from "./AdminDashboardView";
import ManagerDashboardView from "./ManagerDashboardView";

const shimmerCSS = `
  @keyframes dashSkimmer {
    0%   { background-position: -800px 0; }
    100% { background-position: 800px 0; }
  }
  .dsk {
    background: linear-gradient(90deg, #e8edf2 25%, #f5f7fa 50%, #e8edf2 75%);
    background-size: 800px 100%;
    animation: dashSkimmer 1.4s infinite linear;
    border-radius: 8px;
  }
`;

function DashboardSkeleton() {
  return (
    <>
      <style>{shimmerCSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="dsk" style={{ height: 28, width: 220, marginBottom: 10 }} />
            <div className="dsk" style={{ height: 16, width: 320 }} />
          </div>
          <div className="dsk" style={{ height: 40, width: 140, borderRadius: 8 }} />
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dsk" style={{ height: 110, borderRadius: 12 }} />
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px" }}>
          <div className="dsk" style={{ height: 280, borderRadius: 12 }} />
          <div className="dsk" style={{ height: 280, borderRadius: 12 }} />
        </div>

        {/* Table */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB" }}>
          <div className="dsk" style={{ height: 52, width: "100%", borderRadius: 0, marginBottom: 1 }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="dsk" style={{ height: 48, width: "100%", borderRadius: 0, marginBottom: 1 }} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { isLoading } = useUserRole();

  useEffect(() => {
    document.title = META_CONSTANTS.dashboard.fullTitle;
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Staff role has no access to the dashboard — they land on /ticket-booking directly from login.
  // Dashboard is only for Admin and Manager roles.
  return (
    <RoleView
      admin={<AdminDashboardView />}
      manager={<ManagerDashboardView />}
      fallback={<AdminDashboardView />}
    />
  );
}
