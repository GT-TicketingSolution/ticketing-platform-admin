/**
 * Dashboard Loading UI
 * This file is auto-used by Next.js App Router as the Suspense fallback
 * while any dashboard page is loading. It renders instantly on sidebar
 * navigation, eliminating the perceived delay.
 */

export default function DashboardLoading() {
  const shimmer = `
    @keyframes shimmer {
      0%   { background-position: -800px 0; }
      100% { background-position: 800px 0; }
    }
    .sk {
      background: linear-gradient(90deg, #e8edf2 25%, #f5f7fa 50%, #e8edf2 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s infinite linear;
      border-radius: 8px;
    }
  `;

  return (
    <>
      <style>{shimmer}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          width: "100%",
        }}
      >
        {/* ── Page title skeleton ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="sk" style={{ height: 28, width: 220, marginBottom: 10 }} />
            <div className="sk" style={{ height: 16, width: 320 }} />
          </div>
          <div className="sk" style={{ height: 40, width: 140, borderRadius: 8 }} />
        </div>

        {/* ── Filter bar skeleton ── */}
        <div
          className="sk"
          style={{
            height: 64,
            width: "100%",
            borderRadius: 12,
          }}
        />

        {/* ── Stat cards skeleton ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="sk"
              style={{
                height: 110,
                borderRadius: 12,
              }}
            />
          ))}
        </div>

        {/* ── Chart area skeleton ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "18px",
          }}
        >
          <div className="sk" style={{ height: 280, borderRadius: 12 }} />
          <div className="sk" style={{ height: 280, borderRadius: 12 }} />
        </div>

        {/* ── Table skeleton ── */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #E5E7EB",
          }}
        >
          {/* Table header */}
          <div
            className="sk"
            style={{ height: 52, width: "100%", borderRadius: 0, marginBottom: 1 }}
          />
          {/* Table rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                padding: "14px 20px",
                borderBottom: "1px solid #F0F4F8",
              }}
            >
              <div className="sk" style={{ height: 16, flex: 2 }} />
              <div className="sk" style={{ height: 16, flex: 3 }} />
              <div className="sk" style={{ height: 16, flex: 2 }} />
              <div className="sk" style={{ height: 16, flex: 1 }} />
              <div className="sk" style={{ height: 16, flex: 1 }} />
              <div className="sk" style={{ height: 20, flex: 1, borderRadius: 20 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
