"use client";

import { useState, useRef, useCallback } from "react";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Loader2,
  Ticket,
  Clock,
  User,
  MapPin,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import UnderConstruction from "@/components/ui/UnderConstruction";

// Mock ticket database for validation
const VALID_TICKETS: Record<
  string,
  {
    id: string;
    visitor: string;
    type: string;
    date: string;
    attraction: string;
    status: "valid" | "used" | "expired";
  }
> = {
  "TKT-9021": { id: "TKT-9021", visitor: "Priya Singh", type: "Adult", date: "2026-08-07", attraction: "Main Palace", status: "valid" },
  "TKT-9020": { id: "TKT-9020", visitor: "Rahul Gupta", type: "Group (5)", date: "2026-08-07", attraction: "Wax Museum", status: "used" },
  "TKT-9019": { id: "TKT-9019", visitor: "Sunita Devi", type: "Child", date: "2026-08-07", attraction: "Sheesh Mahal", status: "valid" },
  "TKT-9018": { id: "TKT-9018", visitor: "Manish Rao", type: "Adult", date: "2026-08-06", attraction: "Main Palace", status: "expired" },
  "TKT-9017": { id: "TKT-9017", visitor: "Kavya Nair", type: "Senior", date: "2026-08-07", attraction: "Main Palace", status: "valid" },
};

type ScanResult = {
  status: "valid" | "used" | "expired" | "invalid";
  ticket?: (typeof VALID_TICKETS)[string];
  scannedId: string;
};

export default function ScannerPage() {
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processTicketId = useCallback((rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!id) return;

    setScanning(true);
    setScanResult(null);

    // Simulate network/scan delay
    setTimeout(() => {
      const ticket = VALID_TICKETS[id];
      const result: ScanResult = ticket
        ? { status: ticket.status, ticket, scannedId: id }
        : { status: "invalid", scannedId: id };

      setScanResult(result);
      setHistory((prev) => [result, ...prev.slice(0, 9)]);
      setScanning(false);
    }, 800);
  }, []);

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    processTicketId(manualInput);
    setManualInput("");
  };

  const handleReset = () => {
    setScanResult(null);
    setManualInput("");
    inputRef.current?.focus();
  };

  const STATUS_CONFIG = {
    valid: { label: "Valid — Entry Granted ✓", bg: "#F0FDF4", border: "#16A34A", text: "#16A34A", icon: <CheckCircle2 size={32} color="#16A34A" /> },
    used: { label: "Already Used — Entry Denied", bg: "#FFF7ED", border: "#EA580C", text: "#EA580C", icon: <XCircle size={32} color="#EA580C" /> },
    expired: { label: "Expired Ticket — Entry Denied", bg: "#FEF2F2", border: "#DC2626", text: "#DC2626", icon: <XCircle size={32} color="#DC2626" /> },
    invalid: { label: "Invalid Ticket — Not Found", bg: "#FEF2F2", border: "#DC2626", text: "#DC2626", icon: <XCircle size={32} color="#DC2626" /> },
  };

  const historyStatusColors: Record<string, string> = {
    valid: "#16A34A",
    used: "#EA580C",
    expired: "#DC2626",
    invalid: "#DC2626",
  };

  return  <UnderConstruction />;
    // <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>

    //   {/* ── Page Header ── */}
    //   <div>
    //     <h1 style={{ fontFamily: typography.fontFamily.sans, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize["2xl"], color: colors.text.primary, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
    //       <ScanLine size={28} color={colors.brand.primary} />
    //       Ticket Scanner
    //     </h1>
    //     <p style={{ fontFamily: typography.fontFamily.sans, fontSize: "14px", color: colors.text.muted, margin: "4px 0 0 0" }}>
    //       Scan visitor QR codes or enter ticket IDs manually to validate entry.
    //     </p>
    //   </div>

    //   {/* ── Main Scanner Area ── */}
    //   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

    //     {/* Scanner Panel */}
    //     <div style={{ background: "#FFFFFF", borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden", border: `1px solid ${colors.header.border}` }}>
    //       {/* QR Viewfinder */}
    //       <div
    //         style={{
    //           background: colors.sidebar.bg,
    //           padding: "32px",
    //           display: "flex",
    //           flexDirection: "column",
    //           alignItems: "center",
    //           justifyContent: "center",
    //           gap: "16px",
    //           minHeight: "220px",
    //           position: "relative",
    //         }}
    //       >
    //         {scanning ? (
    //           <>
    //             <Loader2 size={48} color={colors.brand.primary} style={{ animation: "spin 1s linear infinite" }} />
    //             <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
    //               Validating ticket…
    //             </span>
    //           </>
    //         ) : scanResult ? (
    //           <>
    //             {STATUS_CONFIG[scanResult.status].icon}
    //             <div style={{ textAlign: "center" }}>
    //               <div style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "16px", color: STATUS_CONFIG[scanResult.status].text }}>
    //                 {STATUS_CONFIG[scanResult.status].label}
    //               </div>
    //               <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
    //                 {scanResult.scannedId}
    //               </div>
    //             </div>
    //             <button
    //               onClick={handleReset}
    //               style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "8px 16px", color: "#FFFFFF", fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
    //             >
    //               <RotateCcw size={14} /> Scan Next
    //             </button>
    //           </>
    //         ) : (
    //           <>
    //             {/* QR frame decoration */}
    //             <div style={{ position: "relative", width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
    //               <ScanLine size={64} color={colors.brand.primary} style={{ opacity: 0.8 }} />
    //               {/* Corner brackets */}
    //               {(["tl", "tr", "bl", "br"] as const).map((corner) => (
    //                 <div key={corner} style={{
    //                   position: "absolute",
    //                   width: "20px",
    //                   height: "20px",
    //                   borderColor: colors.brand.primary,
    //                   borderStyle: "solid",
    //                   borderWidth: 0,
    //                   ...(corner === "tl" ? { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderRadius: "4px 0 0 0" } : {}),
    //                   ...(corner === "tr" ? { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderRadius: "0 4px 0 0" } : {}),
    //                   ...(corner === "bl" ? { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderRadius: "0 0 0 4px" } : {}),
    //                   ...(corner === "br" ? { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderRadius: "0 0 4px 0" } : {}),
    //                 }} />
    //               ))}
    //             </div>
    //             <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
    //               Camera integration — point at QR code
    //             </span>
    //           </>
    //         )}
    //       </div>

    //       {/* Manual Input */}
    //       <div style={{ padding: "20px" }}>
    //         <p style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 600, color: colors.text.muted, margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    //           Or Enter Ticket ID Manually
    //         </p>
    //         <form onSubmit={handleManualScan} style={{ display: "flex", gap: "10px" }}>
    //           <input
    //             ref={inputRef}
    //             type="text"
    //             value={manualInput}
    //             onChange={(e) => setManualInput(e.target.value)}
    //             placeholder="e.g. TKT-9021"
    //             autoFocus
    //             style={{
    //               flex: 1,
    //               border: `1.5px solid ${colors.header.border}`,
    //               borderRadius: "8px",
    //               padding: "10px 14px",
    //               fontFamily: typography.fontFamily.sans,
    //               fontSize: "14px",
    //               color: colors.text.primary,
    //               outline: "none",
    //               background: "#FAFAFA",
    //               textTransform: "uppercase",
    //             }}
    //           />
    //           <button
    //             type="submit"
    //             disabled={!manualInput.trim() || scanning}
    //             style={{
    //               background: manualInput.trim() && !scanning ? colors.brand.primary : "#E5E7EB",
    //               color: manualInput.trim() && !scanning ? colors.sidebar.bg : "#9CA3AF",
    //               border: "none",
    //               borderRadius: "8px",
    //               padding: "10px 18px",
    //               fontFamily: typography.fontFamily.sans,
    //               fontWeight: 700,
    //               fontSize: "14px",
    //               cursor: manualInput.trim() && !scanning ? "pointer" : "not-allowed",
    //               display: "flex",
    //               alignItems: "center",
    //               gap: "6px",
    //               transition: "all 0.15s ease",
    //               whiteSpace: "nowrap",
    //             }}
    //           >
    //             {scanning ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <ScanLine size={15} />}
    //             Validate
    //           </button>
    //         </form>

    //         <p style={{ fontFamily: typography.fontFamily.sans, fontSize: "12px", color: colors.text.muted, margin: "10px 0 0 0" }}>
    //           💡 Try: <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>TKT-9021</code>, <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>TKT-9020</code>, <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>TKT-9018</code>
    //         </p>
    //       </div>
    //     </div>

    //     {/* Result / Info Panel */}
    //     <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

    //       {/* Scan Result Card */}
    //       {scanResult && scanResult.ticket && (
    //         <div style={{
    //           background: STATUS_CONFIG[scanResult.status].bg,
    //           border: `2px solid ${STATUS_CONFIG[scanResult.status].border}`,
    //           borderRadius: "14px",
    //           padding: "20px",
    //           display: "flex",
    //           flexDirection: "column",
    //           gap: "14px",
    //         }}>
    //           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    //             {STATUS_CONFIG[scanResult.status].icon}
    //             <div>
    //               <div style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "15px", color: STATUS_CONFIG[scanResult.status].text }}>
    //                 {STATUS_CONFIG[scanResult.status].label}
    //               </div>
    //               <div style={{ fontSize: "12px", color: colors.text.muted }}>{scanResult.scannedId}</div>
    //             </div>
    //           </div>

    //           <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    //             {[
    //               { icon: <User size={15} />, label: "Visitor", value: scanResult.ticket.visitor },
    //               { icon: <Ticket size={15} />, label: "Ticket Type", value: scanResult.ticket.type },
    //               { icon: <MapPin size={15} />, label: "Attraction", value: scanResult.ticket.attraction },
    //               { icon: <CalendarDays size={15} />, label: "Valid Date", value: scanResult.ticket.date },
    //             ].map(({ icon, label, value }) => (
    //               <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "10px 14px" }}>
    //                 <span style={{ color: STATUS_CONFIG[scanResult.status].text, flexShrink: 0 }}>{icon}</span>
    //                 <div>
    //                   <div style={{ fontFamily: typography.fontFamily.sans, fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
    //                   <div style={{ fontFamily: typography.fontFamily.sans, fontSize: "14px", fontWeight: 600, color: colors.text.primary }}>{value}</div>
    //                 </div>
    //               </div>
    //             ))}
    //           </div>
    //         </div>
    //       )}

    //       {/* Empty state when no result yet */}
    //       {!scanResult && !scanning && (
    //         <div style={{ background: "#FFFFFF", borderRadius: "14px", border: `1px solid ${colors.header.border}`, padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", textAlign: "center", flex: 1 }}>
    //           <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: colors.bg.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
    //             <Ticket size={28} color={colors.text.muted} />
    //           </div>
    //           <div>
    //             <div style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "15px", color: colors.text.primary }}>Ready to Scan</div>
    //             <div style={{ fontSize: "13px", color: colors.text.muted, marginTop: "4px" }}>Point scanner at QR code or enter ticket ID to validate entry</div>
    //           </div>
    //         </div>
    //       )}

    //       {/* Today's Scan Stats */}
    //       <div style={{ background: "#FFFFFF", borderRadius: "14px", border: `1px solid ${colors.header.border}`, padding: "18px" }}>
    //         <h3 style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", color: colors.text.primary, margin: "0 0 14px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    //           Today's Scan Stats
    //         </h3>
    //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
    //           {[
    //             { label: "Validated", value: 114, color: "#16A34A" },
    //             { label: "Pending", value: 28, color: "#EA580C" },
    //             { label: "Rejected", value: 7, color: "#DC2626" },
    //           ].map(({ label, value, color }) => (
    //             <div key={label} style={{ textAlign: "center", background: "#F8FAFC", borderRadius: "10px", padding: "12px 8px" }}>
    //               <div style={{ fontFamily: typography.fontFamily.sans, fontSize: "22px", fontWeight: 800, color }}>{value}</div>
    //               <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, marginTop: "2px" }}>{label}</div>
    //             </div>
    //           ))}
    //         </div>
    //       </div>
    //     </div>
    //   </div>

    //   {/* ── Scan History ── */}
    //   {/* {history.length > 0 && (
    //     <div style={{ background: "#FFFFFF", borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: `1px solid ${colors.header.border}`, overflow: "hidden" }}>
    //       <div style={{ padding: "16px 22px", borderBottom: `1px solid ${colors.header.border}` }}>
    //         <h3 style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "15px", color: colors.text.primary, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
    //           <Clock size={16} color={colors.text.muted} /> Scan History (this session)
    //         </h3>
    //       </div>
    //       <div style={{ overflowX: "auto" }}>
    //         <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: typography.fontFamily.sans, fontSize: "13px" }}>
    //           <thead>
    //             <tr style={{ background: "#F8FAFC", color: colors.text.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    //               <th style={{ padding: "12px 18px", textAlign: "left" }}>Ticket ID</th>
    //               <th style={{ padding: "12px 18px", textAlign: "left" }}>Visitor</th>
    //               <th style={{ padding: "12px 18px", textAlign: "left" }}>Attraction</th>
    //               <th style={{ padding: "12px 18px", textAlign: "left" }}>Result</th>
    //             </tr>
    //           </thead>
    //           <tbody>
    //             {history.map((h, i) => (
    //               <tr key={i} style={{ borderTop: `1px solid ${colors.header.border}` }} className="table-row-hover">
    //                 <td style={{ padding: "12px 18px", fontWeight: 700, color: colors.brand.accent }}>{h.scannedId}</td>
    //                 <td style={{ padding: "12px 18px" }}>{h.ticket?.visitor ?? "—"}</td>
    //                 <td style={{ padding: "12px 18px" }}>{h.ticket?.attraction ?? "—"}</td>
    //                 <td style={{ padding: "12px 18px" }}>
    //                   <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: h.status === "valid" ? "#F0FDF4" : "#FEF2F2", color: historyStatusColors[h.status] }}>
    //                     {h.status === "valid" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    //                     {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
    //                   </span>
    //                 </td>
    //               </tr>
    //             ))}
    //           </tbody>
    //         </table>
    //       </div>
    //     </div>
    //   )} */}

    //   <style>{`
    //     @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    //     .table-row-hover:hover { background: #F8FAFC !important; }
    //   `}</style>
    // </div>
 
}
