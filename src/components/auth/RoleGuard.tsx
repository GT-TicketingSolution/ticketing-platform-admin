"use client";

import React from "react";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { colors, typography } from "@/lib/theme";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Access Denied card for unauthorized views
 */
export function AccessDeniedCard({ title = "Access Restricted", description = "You do not have permission to view this section with your current role." }: { title?: string; description?: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "48px 24px",
        textAlign: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        border: "1px solid #F3F4F6",
        maxWidth: "500px",
        margin: "40px auto",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "#FEF2F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
        }}
      >
        <ShieldAlert size={32} color="#DC2626" />
      </div>
      <h2
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: "20px",
          fontWeight: 700,
          color: colors.text.primary,
          margin: "0 0 8px 0",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: "14px",
          color: colors.text.muted,
          lineHeight: "1.5",
          margin: "0 0 24px 0",
        }}
      >
        {description}
      </p>
      <Link
        href="/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: colors.brand.primary,
          color: colors.sidebar.bg,
          fontWeight: 600,
          fontSize: "14px",
          padding: "10px 20px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> Go to Dashboard
      </Link>
    </div>
  );
}

/**
 * Protects an entire component or page section by role.
 */
export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { role, isLoading } = useUserRole();

  if (isLoading) return null;

  if (!allowedRoles.includes(role)) {
    return fallback ? <>{fallback}</> : <AccessDeniedCard />;
  }

  return <>{children}</>;
}

interface HasRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Inline conditional wrapper for action elements (buttons, links, controls).
 */
export function HasRole({ roles, children, fallback = null }: HasRoleProps) {
  const { role } = useUserRole();
  if (!roles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}

interface RoleViewProps {
  admin?: React.ReactNode;
  manager?: React.ReactNode;
  staff?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Declarative component that renders specific UI based on user role.
 */
export function RoleView({ admin, manager, staff, fallback = null }: RoleViewProps) {
  const { role, isLoading } = useUserRole();

  if (isLoading) return null;

  if (role === "Admin" && admin) return <>{admin}</>;
  if (role === "Manager" && manager) return <>{manager}</>;
  if (role === "Staff" && staff) return <>{staff}</>;

  return <>{fallback}</>;
}
