"use client";

import React, { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { colors } from "@/lib/theme";
import AdminReportsView from "@/components/reports/AdminReportsView";
import StaffReportsView from "@/components/reports/StaffReportsView";

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const { role, isStaff } = useUserRole();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          padding: "24px",
          backgroundColor: colors.bg.page,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              height: "28px",
              width: "260px",
              backgroundColor: "#E2E8F0",
              borderRadius: "6px",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              height: "16px",
              width: "420px",
              backgroundColor: "#F1F5F9",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
    );
  }

  // Staff role gets the dedicated StaffReportsView (past days mock, 0 backend API calls)
  if (role === "Staff" || isStaff) {
    return <StaffReportsView />;
  }

  // Admin & Manager roles get the original AdminReportsView (exact dev branch with live APIs)
  return <AdminReportsView />;
}
