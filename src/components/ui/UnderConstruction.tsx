import { colors, typography } from "@/lib/theme";

export default function UnderConstruction() {
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
        Development in Progress
      </p>
    </div>
  );
}
