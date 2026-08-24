"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Camera,
  CameraOff,
  User,
  Ticket as TicketIcon,
  MapPin,
  CalendarCheck,
  CalendarX,
  Clock,
  ArrowRight,
  Search,
  Check,
  X,
  RefreshCw,
  Info,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import {
  useRecentScans,
  fetchTicketDetails,
  useAdmitTicketMutation,
  useRejectTicketMutation,
  type ScannerTicketDetails,
  type ScanItem,
} from "@/hooks/useScannerQueries";
import type { TicketStatus, ScannedTicketData } from "./types";

const REJECTION_REASONS = [
  "Date Mismatch / Expired Ticket",
  "Future Date Ticket (Not Valid Today)",
  "Already Used / Duplicate Entry Attempt",
  "Unrecognized / Fake QR Code",
  "Incorrect Gate / Venue Access",
  "Payment Disputed / Pending",
] as const;

// Helper to format date strings
const getTodayFormatted = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string | null) => {
  if (!dateStr || dateStr === "-" || dateStr === "—") return "-";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatTimeDisplay = (isoOrTime: string | null) => {
  if (!isoOrTime || isoOrTime === "-" || isoOrTime === "—") return "-";
  try {
    if (isoOrTime.includes("T") || isoOrTime.includes("Z")) {
      return new Date(isoOrTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return isoOrTime;
  } catch {
    return isoOrTime;
  }
};

export default function ScannerPage() {
  const todayDateStr = getTodayFormatted();
  const [manualInput, setManualInput] = useState("");
  const isScanningActive = true;
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<ScannedTicketData | null>(null);
  const [scanVerdict, setScanVerdict] = useState<"Allowed" | "Denied" | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Camera feed states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // React Query Hooks for Server APIs
  const { data: scansData, isLoading: isLoadingScans } = useRecentScans(20);
  const admitMutation = useAdmitTicketMutation();
  const rejectMutation = useRejectTicketMutation();

  const stats = scansData?.summary || {
    totalScans: scansData?.scans?.length ?? 0,
    allowedAdmitted: (scansData?.scans || []).filter((s) => s.verdict === "ALLOWED" || s.verdict === "Allowed").length,
    rejectedIssues: (scansData?.scans || []).filter((s) => s.verdict !== "ALLOWED" && s.verdict !== "Allowed").length,
  };

  const scanHistory: ScanItem[] = scansData?.scans || [];

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>("");
  const scanCooldownRef = useRef<boolean>(false);

  useEffect(() => {
    document.title = "Ticket Scanner | Ticketing Solution";
  }, []);

  // QR decode loop using jsQR
  const startScanLoop = useCallback((onDetect: (code: string) => void) => {
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      const { videoWidth: w, videoHeight: h } = video;
      if (w === 0 || h === 0) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });

      if (code && code.data && !scanCooldownRef.current && code.data !== lastScannedRef.current) {
        lastScannedRef.current = code.data;
        scanCooldownRef.current = true;
        onDetect(code.data);
        setTimeout(() => {
          scanCooldownRef.current = false;
          lastScannedRef.current = "";
        }, 2500);
      }

      setTimeout(() => {
        scanLoopRef.current = requestAnimationFrame(tick);
      }, 100);
    };
    scanLoopRef.current = requestAnimationFrame(tick);
  }, []);

  const stopScanLoop = useCallback(() => {
    if (scanLoopRef.current !== null) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
  }, []);

  // Start / Stop Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => { });
            startScanLoop((decoded) => handleProcessScan(decoded));
          };
        }
        setCameraActive(true);
      } else {
        setCameraError("Camera not supported on this browser. Use manual entry below.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      const msg =
        error?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : error?.name === "NotFoundError"
            ? "No camera device found on this device."
            : error?.message || "Unable to access camera. Please allow camera permissions.";
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    stopScanLoop();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleToggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 150);
    }
  };

  useEffect(() => {
    return () => {
      stopScanLoop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [stopScanLoop]);

  // Process ticket search/scan via API
  const handleProcessScan = useCallback(
    async (codeOrId: string) => {
      const sanitized = codeOrId.trim();
      if (!sanitized) return;

      setIsProcessing(true);
      setScanVerdict(null);
      setRejectionReason("");

      try {
        const ticket: ScannerTicketDetails = await fetchTicketDetails(sanitized);

        let computedStatus: TicketStatus = ticket.status;
        if (ticket.status !== "used" && ticket.status !== "cancelled") {
          if (ticket.visitDate) {
            const isDateToday = ticket.visitDate === todayDateStr;
            const isPast = ticket.visitDate < todayDateStr;
            if (!isDateToday) {
              computedStatus = isPast ? "expired" : "future";
            } else {
              computedStatus = "valid";
            }
          }
        }

        const ticketData: ScannedTicketData = {
          id: ticket.id,
          invoiceNumber: ticket.invoiceNumber || ticket.id,
          visitorName: ticket.visitorName || "-",
          mobileNumber: ticket.mobileNumber || "-",
          email: ticket.email || "-",
          visitorType: ticket.visitorType || "-",
          attraction: ticket.attraction || "-",
          zone: ticket.zone || "-",
          gate: ticket.gate || "-",
          timeSlot: ticket.timeSlot || "-",
          visitDate: ticket.visitDate || "-",
          totalVisitors: ticket.totalVisitors || 1,
          breakdown: ticket.breakdown || [],
          totalAmount: ticket.totalAmount || 0,
          paymentMode: ticket.paymentMode || "-",
          paymentStatus: ticket.paymentStatus || "Paid",
          status: computedStatus,
          seats: ticket.seats || null,
          bogie: ticket.bogie || null,
          specialNotes: ticket.specialNotes || null,
        };

        setCurrentTicket(ticketData);
      } catch (err: any) {
        // Unknown or invalid QR code
        const invalidTicket: ScannedTicketData = {
          id: sanitized,
          invoiceNumber: sanitized,
          visitorName: "Unknown / Not Found",
          mobileNumber: "-",
          email: "-",
          visitorType: "-",
          attraction: "-",
          zone: "-",
          gate: "-",
          timeSlot: "-",
          visitDate: "-",
          totalVisitors: 0,
          breakdown: [],
          totalAmount: 0,
          paymentMode: "-",
          paymentStatus: "-",
          status: "invalid",
          specialNotes: "No active booking or ticket matches this scanned identifier.",
        };
        setCurrentTicket(invalidTicket);
      } finally {
        setIsProcessing(false);
        setTimeout(() => {
          ticketSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    },
    [todayDateStr]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleProcessScan(manualInput);
      setManualInput("");
    }
  };

  // Action: Allow / Admit Visitor via Server API
  const handleAllowEntry = async () => {
    if (!currentTicket || currentTicket.status !== "valid") return;

    try {
      const res = await admitMutation.mutateAsync(currentTicket.id);
      const updatedTicket: ScannedTicketData = {
        ...currentTicket,
        status: "used",
        scannedAt: res?.admission?.admittedAt
          ? formatTimeDisplay(res.admission.admittedAt) + " Today"
          : "Just now",
        validatedBy: "Gate Staff (You)",
      };

      setCurrentTicket(updatedTicket);
      setScanVerdict("Allowed");
    } catch {
      // Handled in mutation onError
    }
  };

  // Action: Deny / Reject Entry via Server API
  const handleRejectEntry = async (reasonText: string) => {
    if (!currentTicket) return;

    try {
      await rejectMutation.mutateAsync({
        ticketId: currentTicket.id,
        reason: reasonText,
      });

      setScanVerdict("Denied");
      setRejectionReason(reasonText);
      setShowRejectModal(false);
    } catch {
      // Handled in mutation onError
    }
  };

  // Action: NEXT SCAN (Resets scanner for the next visitor)
  const handleNextScan = () => {
    setCurrentTicket(null);
    setScanVerdict(null);
    setRejectionReason("");
    setManualInput("");
    inputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      if (e.code === "Space" && currentTicket) {
        e.preventDefault();
        handleNextScan();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTicket]);

  const isDateToday = currentTicket ? currentTicket.visitDate === todayDateStr : false;
  const isPastDate =
    currentTicket && currentTicket.visitDate && currentTicket.visitDate !== "-" && currentTicket.visitDate !== "—"
      ? currentTicket.visitDate < todayDateStr
      : false;
  const isFutureDate =
    currentTicket && currentTicket.visitDate && currentTicket.visitDate !== "-" && currentTicket.visitDate !== "—"
      ? currentTicket.visitDate > todayDateStr
      : false;

  const isAllowButtonEnabled =
    Boolean(currentTicket && currentTicket.status === "valid" && currentTicket.paymentStatus === "Paid") &&
    !admitMutation.isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "110px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ── Page Header & Shift Info ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${colors.sidebar.bg} 0%, #1A496E 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.brand.primary,
                boxShadow: "0 4px 12px rgba(12, 42, 66, 0.2)",
              }}
            >
              <ScanLine size={24} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: typography.fontSize["2xl"],
                  color: colors.text.primary,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                QR Ticket &amp; Invoice Scanner
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    background: "#DCFCE7",
                    color: "#16A34A",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #BBF7D0",
                  }}
                >
                  Live Gate Ready
                </span>
              </h1>
              <p style={{ margin: "3px 0 0 0", fontSize: "14px", color: colors.text.muted }}>
                Scan visitor invoice QR codes, inspect ticket validity for <strong style={{ color: colors.brand.accent }}>Today ({formatDisplayDate(todayDateStr)})</strong>, and authorize entry.
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls: Today Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              fontSize: "13px",
              color: colors.text.primary,
              fontWeight: 600,
            }}
          >
            <Clock size={16} color={colors.brand.accent} />
            <span>Today: {formatDisplayDate(todayDateStr)}</span>
          </div>
        </div>
      </div>

      {/* ── Stat Bar (3 Balanced Cards) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {isLoadingScans ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#FFFFFF",
                padding: "16px 20px",
                borderRadius: "12px",
                border: `1px solid ${colors.header.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="scanner-sk" style={{ width: "110px", height: "12px", borderRadius: "4px", marginBottom: "8px" }} />
                <div className="scanner-sk" style={{ width: "50px", height: "26px", borderRadius: "6px" }} />
              </div>
              <div className="scanner-sk" style={{ width: "42px", height: "42px", borderRadius: "10px" }} />
            </div>
          ))
        ) : (
          <>
            <div
              style={{
                background: "#FFFFFF",
                padding: "16px 20px",
                borderRadius: "12px",
                border: `1px solid ${colors.header.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase" }}>Total Scans Today</div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: colors.text.primary, marginTop: "2px" }}>{stats.totalScans}</div>
              </div>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
                <ScanLine size={22} />
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                padding: "16px 20px",
                borderRadius: "12px",
                border: `1px solid ${colors.header.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "#16A34A", fontWeight: 600, textTransform: "uppercase" }}>Allowed / Admitted</div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#16A34A", marginTop: "2px" }}>{stats.allowedAdmitted}</div>
              </div>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}>
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                padding: "16px 20px",
                borderRadius: "12px",
                border: `1px solid ${colors.header.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600, textTransform: "uppercase" }}>Rejected / Issues</div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#DC2626", marginTop: "2px" }}>{stats.rejectedIssues}</div>
              </div>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626" }}>
                <XCircle size={22} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Main Scanner Area (Expanded Full-Width QR Scanner) ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: `1px solid ${colors.header.border}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: "360px" }}>
          {/* LEFT: QR Code Camera & Viewfinder Box (Expanded size) */}
          <div
            style={{
              background: colors.sidebar.bg,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Viewfinder Header Controls */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "20px",
                right: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", padding: "5px 12px", borderRadius: "20px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isScanningActive ? "#22C55E" : "#9CA3AF", animation: isScanningActive ? "pulseDot 1.5s infinite" : "none" }} />
                <span style={{ color: "#FFFFFF", fontSize: "12px", fontWeight: 600 }}>
                  {cameraActive ? "Live Camera Viewfinder" : "Interactive QR Scanner"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleToggleCamera}
                  style={{
                    background: cameraActive ? colors.brand.primary : "rgba(255,255,255,0.18)",
                    color: cameraActive ? colors.sidebar.bg : "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "7px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cameraActive ? <CameraOff size={15} /> : <Camera size={15} />}
                  <span>{cameraActive ? "Stop Camera" : "Start Live Cam"}</span>
                </button>

                {cameraActive && (
                  <button
                    onClick={handleFlipCamera}
                    title="Flip camera"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "7px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Hidden canvas for jsQR frame capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Large Camera Viewfinder */}
            <div style={{ position: "relative", width: "100%", height: "290px", display: cameraActive ? "flex" : "none", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "14px", marginTop: "32px" }}>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px", background: "#000" }}
              />
              <div
                style={{
                  position: "absolute",
                  width: "220px",
                  height: "220px",
                  border: "2px solid rgba(244, 188, 67, 0.45)",
                  borderRadius: "14px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, transparent, ${colors.brand.primary}, transparent)`,
                    boxShadow: `0 0 14px ${colors.brand.primary}`,
                    animation: "laserScan 2.4s ease-in-out infinite",
                  }}
                />
                <div style={{ position: "absolute", top: -2, left: -2, width: 26, height: 26, borderTop: `4px solid ${colors.brand.primary}`, borderLeft: `4px solid ${colors.brand.primary}`, borderRadius: "8px 0 0 0" }} />
                <div style={{ position: "absolute", top: -2, right: -2, width: 26, height: 26, borderTop: `4px solid ${colors.brand.primary}`, borderRight: `4px solid ${colors.brand.primary}`, borderRadius: "0 8px 0 0" }} />
                <div style={{ position: "absolute", bottom: -2, left: -2, width: 26, height: 26, borderBottom: `4px solid ${colors.brand.primary}`, borderLeft: `4px solid ${colors.brand.primary}`, borderRadius: "0 0 0 8px" }} />
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderBottom: `4px solid ${colors.brand.primary}`, borderRight: `4px solid ${colors.brand.primary}`, borderRadius: "0 0 8px 0" }} />
              </div>
            </div>

            {/* Large Interactive Scanner Box — shown when camera is OFF */}
            {!cameraActive && (
              <div
                onClick={handleToggleCamera}
                title="Click to activate camera"
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "360px",
                  height: "250px",
                  background: "radial-gradient(circle, rgba(35, 114, 165, 0.28) 0%, rgba(12, 42, 66, 0.85) 100%)",
                  borderRadius: "16px",
                  border: "2px dashed rgba(244, 188, 67, 0.55)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 0 35px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  marginTop: "32px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "rgba(244, 188, 67, 0.18)",
                      border: `2px solid ${colors.brand.primary}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: colors.brand.primary,
                      marginBottom: "4px",
                    }}
                  >
                    <Camera size={28} />
                  </div>
                  <span style={{ fontSize: "14px", color: "#FFFFFF", letterSpacing: "0.3px", fontWeight: 700 }}>
                    Click to Start Camera Scanner
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                    or enter invoice code manually on the right
                  </span>
                </div>
                <div style={{ position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTop: `3px solid ${colors.brand.primary}`, borderLeft: `3px solid ${colors.brand.primary}`, borderRadius: "6px 0 0 0" }} />
                <div style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTop: `3px solid ${colors.brand.primary}`, borderRight: `3px solid ${colors.brand.primary}`, borderRadius: "0 6px 0 0" }} />
                <div style={{ position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottom: `3px solid ${colors.brand.primary}`, borderLeft: `3px solid ${colors.brand.primary}`, borderRadius: "0 0 0 6px" }} />
                <div style={{ position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottom: `3px solid ${colors.brand.primary}`, borderRight: `3px solid ${colors.brand.primary}`, borderRadius: "0 0 6px 0" }} />
              </div>
            )}

            {cameraError && (
              <div style={{ marginTop: "12px", background: "rgba(220, 38, 38, 0.2)", border: "1px solid rgba(220, 38, 38, 0.4)", borderRadius: "6px", padding: "6px 14px", color: "#FCA5A5", fontSize: "12px", textAlign: "center" }}>
                {cameraError}
              </div>
            )}

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>
                {cameraActive ? "Align invoice QR code inside the viewfinder box" : "Click box above or 'Start Live Cam' to scan with webcam"}
              </span>
            </div>
          </div>

          {/* RIGHT: Validation & Manual Search Form */}
          <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "16px" }}>
            <div>
              <h2 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 700, color: colors.text.primary, display: "flex", alignItems: "center", gap: "8px" }}>
                <Search size={18} color={colors.brand.accent} />
                Validate Invoice or Ticket
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: colors.text.muted }}>
                Enter invoice number or ticket barcode to instantly validate gate admission.
              </p>

              {/* Manual Entry Form */}
              <form onSubmit={handleManualSubmit} style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter Ticket ID / Invoice No / QR Code…"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: "8px",
                      border: `1.5px solid ${colors.header.border}`,
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "14px",
                      fontWeight: 600,
                      color: colors.text.primary,
                      textTransform: "uppercase",
                      outline: "none",
                      boxSizing: "border-box",
                      background: "#F8FAFC",
                    }}
                  />
                  {manualInput && (
                    <button
                      type="button"
                      onClick={() => setManualInput("")}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!manualInput.trim() || isProcessing}
                  style={{
                    background: manualInput.trim() && !isProcessing ? colors.brand.primary : "#E2E8F0",
                    color: manualInput.trim() && !isProcessing ? colors.sidebar.bg : "#94A3B8",
                    border: "none",
                    borderRadius: "8px",
                    padding: "11px 18px",
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: manualInput.trim() && !isProcessing ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Checking…</span>
                    </>
                  ) : (
                    <>
                      <ScanLine size={16} />
                      <span>Scan Code</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Status / Instructions Card */}
            <div
              style={{
                background: "#F8FAFC",
                border: `1px solid ${colors.header.border}`,
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.primary, display: "flex", alignItems: "center", gap: "6px" }}>
                  <ScanLine size={14} color={colors.brand.accent} />
                  Supported Formats
                </span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: "10px" }}>
                  Active Scanner
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: colors.text.muted, lineHeight: "17px" }}>
                Supports printed ticket barcodes, digital PDF invoice QR codes, and complimentary visitor passes.
              </p>
            </div>

            {/* Gate Assistant Tip */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: colors.text.muted, background: "#FEF9C3", padding: "10px 12px", borderRadius: "8px", border: "1px solid #FEF08A" }}>
              <Info size={15} color="#CA8A04" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ color: "#854D0E" }}>
                <strong>Gate Rule:</strong> Only tickets scheduled for <strong>Today ({formatDisplayDate(todayDateStr)})</strong> are authorized for entry. Past or future tickets must be denied.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ticket Details Rendered Directly Below the Scanner UI ── */}
      <div ref={ticketSectionRef} style={{ scrollMarginTop: "20px" }}>
        {isProcessing ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              border: `1.5px solid ${colors.header.border}`,
              padding: "36px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div className="scanner-sk" style={{ width: "100%", height: "48px", borderRadius: "8px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="scanner-sk" style={{ width: "100%", height: "140px", borderRadius: "12px" }} />
                <div className="scanner-sk" style={{ width: "100%", height: "100px", borderRadius: "12px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="scanner-sk" style={{ width: "100%", height: "180px", borderRadius: "12px" }} />
                <div className="scanner-sk" style={{ width: "100%", height: "100px", borderRadius: "12px" }} />
              </div>
            </div>
          </div>
        ) : currentTicket ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              border: `1.5px solid ${currentTicket.status === "valid"
                ? "#22C55E"
                : currentTicket.status === "used"
                  ? "#EA580C"
                  : currentTicket.status === "future"
                    ? "#EAB308"
                    : "#DC2626"
                }`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              overflow: "hidden",
              animation: "fadeInSlide 0.3s ease-out",
            }}
          >
            {/* Dynamic Status Header Banner */}
            <div
              style={{
                background:
                  currentTicket.status === "valid"
                    ? "linear-gradient(90deg, #16A34A 0%, #15803D 100%)"
                    : currentTicket.status === "used"
                      ? "linear-gradient(90deg, #EA580C 0%, #C2410C 100%)"
                      : currentTicket.status === "future"
                        ? "linear-gradient(90deg, #CA8A04 0%, #A16207 100%)"
                        : "linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)",
                color: "#FFFFFF",
                padding: "16px 24px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "6px", display: "flex" }}>
                  {currentTicket.status === "valid" && <CheckCircle2 size={32} color="#FFFFFF" />}
                  {currentTicket.status === "used" && <AlertTriangle size={32} color="#FFFFFF" />}
                  {currentTicket.status === "future" && <Clock size={32} color="#FFFFFF" />}
                  {currentTicket.status === "expired" && <CalendarX size={32} color="#FFFFFF" />}
                  {currentTicket.status === "invalid" && <XCircle size={32} color="#FFFFFF" />}
                  {currentTicket.status === "cancelled" && <XCircle size={32} color="#FFFFFF" />}
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.2px" }}>
                    {currentTicket.status === "valid" && "✓ TICKET VALID — READY TO ALLOW"}
                    {currentTicket.status === "used" && "⚠ ALREADY USED / CHECKED-IN"}
                    {currentTicket.status === "future" && "⏳ FUTURE DATE TICKET — NOT VALID TODAY"}
                    {currentTicket.status === "expired" && "✕ EXPIRED TICKET — DATE PASSED"}
                    {currentTicket.status === "invalid" && "✕ INVALID TICKET — NOT RECOGNIZED"}
                    {currentTicket.status === "cancelled" && "✕ CANCELLED BOOKING — ENTRY DENIED"}
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "2px" }}>
                    {currentTicket.status === "valid" && "Visit date matches today. You can admit the visitor."}
                    {currentTicket.status === "used" && `Already scanned at ${currentTicket.scannedAt || "earlier today"}. Duplicate scan not permitted.`}
                    {currentTicket.status === "future" && `This pass is scheduled for ${formatDisplayDate(currentTicket.visitDate)}. Entry not permitted today.`}
                    {currentTicket.status === "expired" && `This pass was scheduled for ${formatDisplayDate(currentTicket.visitDate)} (Expired).`}
                    {currentTicket.status === "invalid" && "No active booking or ticket matches this scanned identifier."}
                    {currentTicket.status === "cancelled" && "This ticket has been cancelled."}
                  </div>
                </div>
              </div>

              {/* Scanned ID Badge */}
              <div
                style={{
                  background: "rgba(0,0,0,0.25)",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  textAlign: "right",
                }}
              >
                <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8, fontWeight: 700 }}>Scanned Code</div>
                <div style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px" }}>{currentTicket.id}</div>
              </div>
            </div>

            {/* Strict Date Validation Alert Card */}
            <div
              style={{
                padding: "16px 24px",
                background: isDateToday ? "#F0FDF4" : "#FEF2F2",
                borderBottom: `1px solid ${isDateToday ? "#BBF7D0" : "#FECACA"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {isDateToday ? (
                  <CalendarCheck size={24} color="#16A34A" />
                ) : (
                  <CalendarX size={24} color="#DC2626" />
                )}
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: isDateToday ? "#16A34A" : "#DC2626" }}>
                    {isDateToday
                      ? "✓ Date Verification PASSED: Valid for Today"
                      : isPastDate
                        ? "✕ Date Verification FAILED: Expired Visit Date"
                        : isFutureDate
                          ? "⚠ Date Verification FAILED: Future Scheduled Visit"
                          : "✕ Date Verification FAILED"}
                  </span>
                  <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "2px" }}>
                    Ticket Date: <strong>{formatDisplayDate(currentTicket.visitDate)}</strong> | Gate Current Date: <strong>{formatDisplayDate(todayDateStr)}</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: isDateToday ? "#DCFCE7" : "#FEE2E2",
                  color: isDateToday ? "#15803D" : "#B91C1C",
                  border: `1px solid ${isDateToday ? "#86EFAC" : "#FCA5A5"}`,
                }}
              >
                {isDateToday ? "TODAY'S SLOT MATCH" : "DATE MISMATCH"}
              </div>
            </div>

            {/* Ticket Information Body */}
            <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              {/* LEFT COLUMN: Visitor and Attraction Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Visitor Card */}
                <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: `1px solid ${colors.header.border}` }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: colors.brand.accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={15} /> Primary Visitor Information
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Visitor Name</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text.primary }}>{currentTicket.visitorName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Visitor Category</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.sidebar.bg }}>
                        <span style={{ background: "#E2E8F0", padding: "2px 8px", borderRadius: "4px" }}>
                          {currentTicket.visitorType}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Phone Number</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>{currentTicket.mobileNumber}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Email</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>{currentTicket.email}</div>
                    </div>
                  </div>
                </div>

                {/* Attraction Card (Removed Access Zone, Gate, Seat Allocations) */}
                <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: `1px solid ${colors.header.border}` }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: colors.brand.accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} /> Attraction Details
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Attraction</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text.primary }}>{currentTicket.attraction}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Time Slot</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>{currentTicket.timeSlot}</div>
                    </div>
                  </div>
                </div>

                {currentTicket.specialNotes && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#92400E" }}>
                    <strong>Note:</strong> {currentTicket.specialNotes}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Ticket Breakdown, Amount & Action Controls */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}>
                {/* Breakdown Table */}
                <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: `1px solid ${colors.header.border}` }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: colors.brand.accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <TicketIcon size={15} /> Visitors Breakdown
                    </span>
                    <span style={{ background: colors.brand.primary, color: colors.sidebar.bg, padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 800 }}>
                      Total: {currentTicket.totalVisitors} {currentTicket.totalVisitors === 1 ? "Person" : "Persons"}
                    </span>
                  </div>

                  {currentTicket.breakdown.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {currentTicket.breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            background: "#FFFFFF",
                            borderRadius: "6px",
                            border: `1px solid ${colors.header.border}`,
                            fontSize: "13px",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: colors.text.primary }}>
                            {item.quantity}x {item.category}
                          </div>
                          <div style={{ color: colors.text.muted, fontWeight: 600 }}>
                            ₹{item.total}
                          </div>
                        </div>
                      ))}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: "10px",
                          marginTop: "6px",
                          borderTop: `1.5px dashed ${colors.header.border}`,
                          fontSize: "14px",
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ color: colors.text.primary }}>Total Paid ({currentTicket.paymentMode})</span>
                        <span style={{ fontSize: "16px", color: "#16A34A" }}>₹{currentTicket.totalAmount}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: colors.text.muted, fontSize: "13px" }}>No item breakdown available.</div>
                  )}
                </div>

                {/* Validation Verdict Action Buttons */}
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    border: `1.5px solid ${colors.header.border}`,
                    padding: "16px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                    Validator Action
                  </div>

                  {scanVerdict ? (
                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "8px",
                        background: scanVerdict === "Allowed" ? "#F0FDF4" : "#FEF2F2",
                        border: `1px solid ${scanVerdict === "Allowed" ? "#BBF7D0" : "#FECACA"}`,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "16px", fontWeight: 800, color: scanVerdict === "Allowed" ? "#16A34A" : "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        {scanVerdict === "Allowed" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        <span>{scanVerdict === "Allowed" ? "Visitor Admitted Successfully ✓" : "Entry Denied ✕"}</span>
                      </div>
                      {rejectionReason && (
                        <div style={{ fontSize: "12px", color: "#991B1B", marginTop: "4px" }}>
                          Reason: {rejectionReason}
                        </div>
                      )}
                      <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "8px" }}>
                        Click <strong>&quot;Next Scan&quot;</strong> at the bottom right to validate the next visitor in queue.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Primary Allow Button */}
                      <button
                        onClick={handleAllowEntry}
                        disabled={!isAllowButtonEnabled}
                        style={{
                          background: isAllowButtonEnabled ? "#16A34A" : "#94A3B8",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "8px",
                          padding: "14px 20px",
                          fontFamily: typography.fontFamily.sans,
                          fontWeight: 700,
                          fontSize: "15px",
                          cursor: isAllowButtonEnabled ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: isAllowButtonEnabled ? "0 4px 14px rgba(22, 163, 74, 0.3)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {admitMutation.isPending ? (
                          <>
                            <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                            <span>Admitting…</span>
                          </>
                        ) : (
                          <>
                            <Check size={20} />
                            <span>Allow Entry / Admit Visitor</span>
                          </>
                        )}
                      </button>

                      {/* Deny / Reject Button */}
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={rejectMutation.isPending}
                        style={{
                          background: "#FFFFFF",
                          color: "#DC2626",
                          border: "1.5px solid #DC2626",
                          borderRadius: "8px",
                          padding: "10px 16px",
                          fontFamily: typography.fontFamily.sans,
                          fontWeight: 600,
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <X size={16} />
                        <span>Reject Entry / Report Issue</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State when no ticket has been scanned yet */
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              border: `1.5px dashed ${colors.header.border}`,
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "20px",
                background: "#F0F4F8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.brand.accent,
              }}
            >
              <TicketIcon size={36} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: colors.text.primary }}>
                Waiting for QR Scan
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: colors.text.muted, maxWidth: "450px" }}>
                Scan a visitor invoice QR code or enter an ID above. Ticket details, date validity for today, and visitor pass counts will appear here instantly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Scan History Log Table ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: `1px solid ${colors.header.border}`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.header.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} color={colors.brand.accent} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: colors.text.primary }}>
              Recent Gate Scans (This Shift)
            </h3>
            <span style={{ fontSize: "12px", background: "#F1F5F9", padding: "2px 8px", borderRadius: "12px", fontWeight: 600, color: colors.text.muted }}>
              {scanHistory.length} logged
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: typography.fontFamily.sans, fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", color: colors.text.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Time</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Ticket / Invoice</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Visitor</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Attraction</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Visitors</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Gate Verdict</th>
                <th style={{ padding: "12px 18px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingScans ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${colors.header.border}` }}>
                    <td style={{ padding: "12px 18px" }}><div className="scanner-sk" style={{ width: "60px", height: "14px", borderRadius: "4px" }} /></td>
                    <td style={{ padding: "12px 18px" }}><div className="scanner-sk" style={{ width: "80px", height: "14px", borderRadius: "4px" }} /></td>
                    <td style={{ padding: "12px 18px" }}><div className="scanner-sk" style={{ width: "110px", height: "14px", borderRadius: "4px" }} /></td>
                    <td style={{ padding: "12px 18px" }}><div className="scanner-sk" style={{ width: "100px", height: "14px", borderRadius: "4px" }} /></td>
                    <td style={{ padding: "12px 18px" }}><div className="scanner-sk" style={{ width: "50px", height: "14px", borderRadius: "4px" }} /></td>
                    <td style={{ padding: "12px 18px" }}><div className="scanner-sk" style={{ width: "90px", height: "20px", borderRadius: "10px" }} /></td>
                    <td style={{ padding: "12px 18px", textAlign: "right" }}><div className="scanner-sk" style={{ width: "60px", height: "22px", borderRadius: "6px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : scanHistory.length > 0 ? (
                scanHistory.map((item) => {
                  const isAllowed = item.verdict === "ALLOWED" || item.verdict === "Allowed";
                  const gateVerdict = isAllowed ? "Allowed" : item.reason ? `Denied (${item.reason})` : "Denied";
                  const visitorsText = `${item.visitorsCount || 1} Pax`;
                  const scanTime = formatTimeDisplay(item.timestamp);

                  return (
                    <tr key={item.id} style={{ borderTop: `1px solid ${colors.header.border}` }}>
                      <td style={{ padding: "12px 18px", color: colors.text.muted, fontWeight: 500 }}>{scanTime}</td>
                      <td style={{ padding: "12px 18px", fontWeight: 700, color: colors.sidebar.bg }}>{item.ticketId || "-"}</td>
                      <td style={{ padding: "12px 18px", fontWeight: 600, color: colors.text.primary }}>{item.visitorName || "-"}</td>
                      <td style={{ padding: "12px 18px", color: colors.text.primary }}>{item.attraction || "-"}</td>
                      <td style={{ padding: "12px 18px", fontWeight: 600 }}>{visitorsText}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: isAllowed ? "#DCFCE7" : "#FEE2E2",
                            color: isAllowed ? "#16A34A" : "#DC2626",
                          }}
                        >
                          {isAllowed ? <Check size={12} /> : <X size={12} />}
                          {gateVerdict}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <button
                          onClick={() => handleProcessScan(item.ticketId)}
                          style={{
                            background: "#F1F5F9",
                            border: "none",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: colors.brand.accent,
                            cursor: "pointer",
                          }}
                        >
                          Re-Check
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 18px", textAlign: "center", color: colors.text.muted, fontSize: "14px" }}>
                    No recent scans logged yet for this shift.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── REJECTION REASON MODAL ── */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#DC2626", fontWeight: 700, fontSize: "16px" }}>
                <XCircle size={22} /> Deny Entry / Specify Reason
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ background: "none", border: "none", color: colors.text.muted, cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: colors.text.muted, margin: "0 0 16px 0" }}>
              Please select the primary reason for denying visitor access:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleRejectEntry(reason)}
                  disabled={rejectMutation.isPending}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.header.border}`,
                    background: "#F8FAFC",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: colors.text.primary,
                    cursor: rejectMutation.isPending ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                  className="reject-reason-btn"
                >
                  {reason}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRejectModal(false)}
              disabled={rejectMutation.isPending}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                background: "#E2E8F0",
                color: colors.text.primary,
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── PROMINENT BOTTOM-RIGHT "NEXT SCAN" FLOATING ACTION BUTTON ── */}
      <div
        style={{
          position: "fixed",
          bottom: "28px",
          right: "32px",
          zIndex: 900,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={handleNextScan}
          title="Reset scanner for the next visitor (Shortcut: Space)"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary} 0%, #E5AF36 100%)`,
            color: colors.sidebar.bg,
            border: "none",
            borderRadius: "50px",
            padding: "14px 28px",
            fontFamily: typography.fontFamily.sans,
            fontWeight: 800,
            fontSize: "15px",
            letterSpacing: "0.2px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 8px 24px rgba(244, 188, 67, 0.45), 0 2px 6px rgba(0,0,0,0.1)",
            transform: "translateY(0)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="next-scan-btn"
        >
          <RotateCcw size={18} style={{ strokeWidth: 2.5 }} />
          <span>Next Scan / Next Visitor</span>
          <ArrowRight size={18} style={{ strokeWidth: 2.5 }} />
          <span
            style={{
              background: "rgba(1, 27, 47, 0.15)",
              color: colors.sidebar.bg,
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              marginLeft: "2px",
            }}
          >
            SPACE
          </span>
        </button>
      </div>

      {/* ── Custom Animations & Styling ── */}
      <style>{`
        @keyframes laserScan {
          0% { top: 10px; opacity: 0.8; }
          50% { top: calc(100% - 14px); opacity: 1; }
          100% { top: 10px; opacity: 0.8; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scannerShimmer {
          0% { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .scanner-sk {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 600px 100%;
          animation: scannerShimmer 1.4s infinite linear;
        }
        .reject-reason-btn:hover {
          background: #FEF2F2 !important;
          border-color: #DC2626 !important;
          color: #DC2626 !important;
        }
        .next-scan-btn:hover {
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 12px 30px rgba(244, 188, 67, 0.6) !important;
        }
        .next-scan-btn:active {
          transform: translateY(1px) scale(0.98) !important;
        }
      `}</style>
    </div>
  );
}
