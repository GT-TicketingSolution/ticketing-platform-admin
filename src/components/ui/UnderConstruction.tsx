"use client";

import { useEffect } from "react";
import { colors, typography } from "@/lib/theme";

interface UnderConstructionProps {
  title?: string;
}

export default function UnderConstruction({ title }: UnderConstructionProps) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "calc(100vh - 120px)",
      }}
    >
      <p
        style={{
          fontFamily: typography.fontFamily.sans,
          fontWeight: typography.fontWeight.medium,
          fontSize: typography.fontSize.base,
          color: colors.text.muted,
          margin: 0,
        }}
      >
        Coming soon...
      </p>
    </div>
  );
}
