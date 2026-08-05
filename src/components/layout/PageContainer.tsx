"use client";

import { colors } from "@/lib/theme";

// PageContainer wraps individual page content.

export default function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        background: colors.bg.page,
        minHeight: "100%",
      }}
    >
      {children}
    </div>
  );
}
