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
  Volume2,
  VolumeX,
  Search,
  Building2,
  Check,
  X,
  RefreshCw,
  QrCode,
  Info,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";

// Types
export type TicketStatus = "valid" | "used" | "expired" | "future" | "cancelled" | "invalid";

export interface TicketBreakdown {
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ScannedTicketData {
  id: string; // e.g. TKT-2026-9021 or INV-84920
  invoiceNumber: string;
  visitorName: string;
  mobileNumber: string;
  email: string;
  visitorType: "Individual" | "Family" | "Group" | "VIP";
  attraction: string;
  zone: string;
  gate: string;
  timeSlot: string;
  visitDate: string; // YYYY-MM-DD
  totalVisitors: number;
  breakdown: TicketBreakdown[];
  totalAmount: number;
  paymentMode: "UPI" | "Card" | "Cash" | "Online";
  paymentStatus: "Paid" | "Pending" | "Refunded";
  status: TicketStatus;
  scannedAt?: string;
  validatedBy?: string;
  seats?: string;
  bogie?: string;
  specialNotes?: string;
}

export interface ScanLogItem {
  id: string;
  ticketId: string;
  visitorName: string;
  attraction: string;
  visitorsCount: number;
  status: TicketStatus;
  timestamp: string;
  verdict: "Allowed" | "Denied" | "Pending";
  reason?: string;
}

// Helper to format date strings
const getTodayFormatted = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRelativeDate = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
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

// Initial mock database dynamically tuned to current date
const generateMockDatabase = (): Record<string, ScannedTicketData> => {
  const today = getTodayFormatted();
  const yesterday = getRelativeDate(-1);
  const tomorrow = getRelativeDate(2);

  return {
    "TKT-9021": {
      id: "TKT-9021",
      invoiceNumber: "INV-2026-8801",
      visitorName: "Priya Sharma",
      mobileNumber: "+91 98765 43210",
      email: "priya.sharma@example.com",
      visitorType: "Family",
      attraction: "Grand Palace & Royal Gardens",
      zone: "East Wing Courtyard",
      gate: "Gate 1 - Main Entrance",
      timeSlot: "10:00 AM - 01:00 PM",
      visitDate: today,
      totalVisitors: 3,
      breakdown: [
        { category: "Adult", quantity: 2, unitPrice: 250, total: 500 },
        { category: "Child (Under 12)", quantity: 1, unitPrice: 150, total: 150 },
      ],
      totalAmount: 650,
      paymentMode: "UPI",
      paymentStatus: "Paid",
      status: "valid",
      seats: "Row C: 12, 13, 14",
    },
    "TKT-9022": {
      id: "TKT-9022",
      invoiceNumber: "INV-2026-8802",
      visitorName: "Rahul Verma",
      mobileNumber: "+91 98112 34567",
      email: "rahul.verma@example.com",
      visitorType: "Individual",
      attraction: "Heritage Wax Museum",
      zone: "Level 2 Gallery",
      gate: "Gate 2 - Express Lane",
      timeSlot: "11:30 AM - 02:30 PM",
      visitDate: today,
      totalVisitors: 1,
      breakdown: [{ category: "Adult", quantity: 1, unitPrice: 350, total: 350 }],
      totalAmount: 350,
      paymentMode: "Card",
      paymentStatus: "Paid",
      status: "valid",
    },
    "TKT-9023": {
      id: "TKT-9023",
      invoiceNumber: "INV-2026-8803",
      visitorName: "Vikram Malhotra",
      mobileNumber: "+91 97654 32190",
      email: "vikram.m@corporatedomain.com",
      visitorType: "Group",
      attraction: "Wildlife Safari & Forest Trail",
      zone: "Safari Sector B",
      gate: "Gate 4 - Safari Depot",
      timeSlot: "09:00 AM - 12:00 PM",
      visitDate: yesterday, // Expired / Past Date
      totalVisitors: 5,
      breakdown: [
        { category: "Adult", quantity: 4, unitPrice: 400, total: 1600 },
        { category: "Senior Citizen", quantity: 1, unitPrice: 200, total: 200 },
      ],
      totalAmount: 1800,
      paymentMode: "Online",
      paymentStatus: "Paid",
      status: "expired",
      bogie: "Safari Vehicle #04",
      specialNotes: "Scheduled for yesterday's safari slot",
    },
    "TKT-9024": {
      id: "TKT-9024",
      invoiceNumber: "INV-2026-8804",
      visitorName: "Ananya Desai",
      mobileNumber: "+91 99201 55432",
      email: "ananya.desai@gmail.com",
      visitorType: "VIP",
      attraction: "Sheesh Mahal & Light Show",
      zone: "VIP Royal Balcony",
      gate: "VIP Gate A",
      timeSlot: "06:00 PM - 08:30 PM",
      visitDate: tomorrow, // Future Date
      totalVisitors: 2,
      breakdown: [{ category: "VIP Pass", quantity: 2, unitPrice: 750, total: 1500 }],
      totalAmount: 1500,
      paymentMode: "UPI",
      paymentStatus: "Paid",
      status: "future",
      seats: "Balcony VIP-1 & VIP-2",
      specialNotes: "Valid for upcoming weekend show",
    },
    "TKT-9025": {
      id: "TKT-9025",
      invoiceNumber: "INV-2026-8805",
      visitorName: "Sanjay Singhania",
      mobileNumber: "+91 98450 12345",
      email: "sanjay.s@techgroup.in",
      visitorType: "Family",
      attraction: "Aquarium & Ocean Tunnel",
      zone: "Oceanic Pavilion",
      gate: "Gate 3 - Aquatic Center",
      timeSlot: "10:00 AM - 01:00 PM",
      visitDate: today,
      totalVisitors: 4,
      breakdown: [
        { category: "Adult", quantity: 2, unitPrice: 300, total: 600 },
        { category: "Child (Under 12)", quantity: 2, unitPrice: 200, total: 400 },
      ],
      totalAmount: 1000,
      paymentMode: "Cash",
      paymentStatus: "Paid",
      status: "used",
      scannedAt: "10:15 AM Today",
      validatedBy: "Staff Counter #1 (Rajesh K.)",
      specialNotes: "Already checked in at 10:15 AM",
    },
  };
};

export default function ScannerPage() {
  const todayDateStr = getTodayFormatted();
  const [ticketDB, setTicketDB] = useState<Record<string, ScannedTicketData>>(generateMockDatabase);
  const [manualInput, setManualInput] = useState("");
  const [isScanningActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<ScannedTicketData | null>(null);
  const [scanVerdict, setScanVerdict] = useState<"Allowed" | "Denied" | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // Camera feed states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Session stats & history
  const [stats, setStats] = useState({
    totalScans: 48,
    allowed: 42,
    rejected: 6,
  });

  const [scanHistory, setScanHistory] = useState<ScanLogItem[]>([
    {
      id: "LOG-1",
      ticketId: "TKT-9019",
      visitorName: "Amitabh Sen",
      attraction: "Grand Palace",
      visitorsCount: 2,
      status: "valid",
      timestamp: "10:28 AM",
      verdict: "Allowed",
    },
    {
      id: "LOG-2",
      ticketId: "TKT-9018",
      visitorName: "Manish Rao",
      attraction: "Wax Museum",
      visitorsCount: 1,
      status: "expired",
      timestamp: "10:22 AM",
      verdict: "Denied",
      reason: "Date Expired (Yesterday)",
    },
    {
      id: "LOG-3",
      ticketId: "TKT-9017",
      visitorName: "Kavya Nair",
      attraction: "Sheesh Mahal",
      visitorsCount: 4,
      status: "valid",
      timestamp: "10:14 AM",
      verdict: "Allowed",
    },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const scanLoopRef = useRef<number | null>(null); // requestAnimationFrame handle
  const lastScannedRef = useRef<string>("");        // prevent duplicate scans
  const scanCooldownRef = useRef<boolean>(false);    // 2.5s cooldown between scans

  // Play audio tones for validation feedback
  const playSound = useCallback((type: "success" | "error" | "admit") => {
    if (!audioEnabled || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success" || type === "admit") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15); // C#3
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio context might be restricted
    }
  }, [audioEnabled]);

  // ── QR decode loop using jsQR ──────────────────────────────────────────────
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
        // Reset cooldown after 2.5s so next visitor can be scanned
        setTimeout(() => {
          scanCooldownRef.current = false;
          lastScannedRef.current = "";
        }, 2500);
      }

      // ~10 fps is enough for QR scanning and keeps CPU low
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

  // ── Start / Stop Camera Stream ─────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        // videoRef is always mounted — safe to assign directly
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {
              // play() promise rejection is safe to swallow here
            });
            // Start the QR scan loop once video is actually playing
            startScanLoop((decoded) => handleProcessScan(decoded));
          };
        }
        setCameraActive(true);
      } else {
        setCameraError("Camera not supported on this browser. Use manual entry below.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error?.name === "NotAllowedError"
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

  // Toggle Camera
  const handleToggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 150);
    }
  };

  // Clean up camera stream and QR scan loop on unmount
  useEffect(() => {
    return () => {
      stopScanLoop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [stopScanLoop]);

  // Process ticket search/scan
  const handleProcessScan = useCallback(
    (codeOrId: string) => {
      const sanitized = codeOrId.trim().toUpperCase();
      if (!sanitized) return;

      setIsProcessing(true);
      setScanVerdict(null);

      // Simulate quick QR decode & database lookup
      setTimeout(() => {
        setIsProcessing(false);
        const foundTicket = ticketDB[sanitized];

        if (foundTicket) {
          // Check date rule: Must be TODAY only
          const isDateToday = foundTicket.visitDate === todayDateStr;
          const isPast = foundTicket.visitDate < todayDateStr;

          let computedStatus: TicketStatus = foundTicket.status;
          if (foundTicket.status !== "used" && foundTicket.status !== "cancelled") {
            if (!isDateToday) {
              computedStatus = isPast ? "expired" : "future";
            } else {
              computedStatus = "valid";
            }
          }

          const ticketWithComputedStatus = {
            ...foundTicket,
            status: computedStatus,
          };

          setCurrentTicket(ticketWithComputedStatus);

          if (computedStatus === "valid") {
            playSound("success");
          } else {
            playSound("error");
          }
        } else {
          // Create invalid ticket entry
          const invalidTicket: ScannedTicketData = {
            id: sanitized,
            invoiceNumber: sanitized.startsWith("INV") ? sanitized : `INV-UNKNOWN`,
            visitorName: "Unknown / Not Found",
            mobileNumber: "—",
            email: "—",
            visitorType: "Individual",
            attraction: "Unrecognized QR Code",
            zone: "—",
            gate: "—",
            timeSlot: "—",
            visitDate: "—",
            totalVisitors: 0,
            breakdown: [],
            totalAmount: 0,
            paymentMode: "Cash",
            paymentStatus: "Pending",
            status: "invalid",
            specialNotes: "This QR Code or Invoice number was not found in the ticketing system.",
          };
          setCurrentTicket(invalidTicket);
          playSound("error");
        }

        // Smooth scroll to ticket details
        setTimeout(() => {
          ticketSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }, 500);
    },
    [ticketDB, todayDateStr, playSound]
  );

  // Handle Manual Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleProcessScan(manualInput);
      setManualInput("");
    }
  };

  // Action: Allow / Admit Visitor
  const handleAllowEntry = () => {
    if (!currentTicket) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Update ticket state in DB as used
    const updatedTicket: ScannedTicketData = {
      ...currentTicket,
      status: "used",
      scannedAt: `${timeString} Today`,
      validatedBy: "Gate Staff (You)",
    };

    setTicketDB((prev) => ({
      ...prev,
      [currentTicket.id]: updatedTicket,
    }));

    setCurrentTicket(updatedTicket);
    setScanVerdict("Allowed");
    playSound("admit");

    // Update stats
    setStats((prev) => ({
      ...prev,
      totalScans: prev.totalScans + 1,
      allowed: prev.allowed + 1,
    }));

    // Add to session history
    const logItem: ScanLogItem = {
      id: `LOG-${Date.now()}`,
      ticketId: currentTicket.id,
      visitorName: currentTicket.visitorName,
      attraction: currentTicket.attraction,
      visitorsCount: currentTicket.totalVisitors || 1,
      status: "valid",
      timestamp: timeString,
      verdict: "Allowed",
    };
    setScanHistory((prev) => [logItem, ...prev]);
  };

  // Action: Deny / Reject Entry
  const handleRejectEntry = (reasonText: string) => {
    if (!currentTicket) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setScanVerdict("Denied");
    setRejectionReason(reasonText);
    setShowRejectModal(false);
    playSound("error");

    // Update stats
    setStats((prev) => ({
      ...prev,
      totalScans: prev.totalScans + 1,
      rejected: prev.rejected + 1,
    }));

    // Add to session history
    const logItem: ScanLogItem = {
      id: `LOG-${Date.now()}`,
      ticketId: currentTicket.id,
      visitorName: currentTicket.visitorName,
      attraction: currentTicket.attraction,
      visitorsCount: currentTicket.totalVisitors || 1,
      status: currentTicket.status,
      timestamp: timeString,
      verdict: "Denied",
      reason: reasonText,
    };
    setScanHistory((prev) => [logItem, ...prev]);
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

  // Keyboard shortcut listener: Spacebar for Next Scan when ticket is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in manual input, don't trigger shortcut
      if (document.activeElement === inputRef.current) return;

      if (e.code === "Space" && currentTicket) {
        e.preventDefault();
        handleNextScan();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTicket]);

  // Date check evaluation
  const isDateToday = currentTicket ? currentTicket.visitDate === todayDateStr : false;
  const isPastDate = currentTicket ? currentTicket.visitDate < todayDateStr && currentTicket.visitDate !== "—" : false;
  const isFutureDate = currentTicket ? currentTicket.visitDate > todayDateStr && currentTicket.visitDate !== "—" : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "110px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* ── Page Header & Gate Status ── */}
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

        {/* Top Controls: Audio & Shift Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? "Mute beep sound" : "Enable beep sound"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              background: audioEnabled ? "#F0FDF4" : "#FFFFFF",
              color: audioEnabled ? "#16A34A" : colors.text.muted,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{audioEnabled ? "Sound On" : "Sound Muted"}</span>
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              padding: "6px 14px",
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

      {/* ── Stat Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div
          style={{
            background: "#FFFFFF",
            padding: "14px 18px",
            borderRadius: "12px",
            border: `1px solid ${colors.header.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase" }}>Total Scans Today</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "2px" }}>{stats.totalScans}</div>
          </div>
          <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
            <ScanLine size={20} />
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "14px 18px",
            borderRadius: "12px",
            border: `1px solid ${colors.header.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#16A34A", fontWeight: 600, textTransform: "uppercase" }}>Allowed / Admitted</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#16A34A", marginTop: "2px" }}>{stats.allowed}</div>
          </div>
          <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "14px 18px",
            borderRadius: "12px",
            border: `1px solid ${colors.header.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600, textTransform: "uppercase" }}>Rejected / Issues</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#DC2626", marginTop: "2px" }}>{stats.rejected}</div>
          </div>
          <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626" }}>
            <XCircle size={20} />
          </div>
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${colors.sidebar.bg} 0%, #153E61 100%)`,
            padding: "14px 18px",
            borderRadius: "12px",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 600, textTransform: "uppercase" }}>Gate Station</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: colors.brand.primary, marginTop: "2px" }}>Gate 1 — Main Entry</div>
          </div>
          <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: colors.brand.primary }}>
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* ── Main Scanner Area (Top Panel) ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: `1px solid ${colors.header.border}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: "380px" }}>
          
          {/* LEFT: QR Code Camera & Viewfinder Box */}
          <div
            style={{
              background: colors.sidebar.bg,
              padding: "24px",
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
                top: "14px",
                left: "16px",
                right: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", padding: "4px 10px", borderRadius: "20px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isScanningActive ? "#22C55E" : "#9CA3AF", animation: isScanningActive ? "pulseDot 1.5s infinite" : "none" }} />
                <span style={{ color: "#FFFFFF", fontSize: "12px", fontWeight: 600 }}>
                  {cameraActive ? "Live Camera" : "Interactive Scanner"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleToggleCamera}
                  style={{
                    background: cameraActive ? colors.brand.primary : "rgba(255,255,255,0.15)",
                    color: cameraActive ? colors.sidebar.bg : "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
                  <span>{cameraActive ? "Stop Cam" : "Use Cam"}</span>
                </button>

                {cameraActive && (
                  <button
                    onClick={handleFlipCamera}
                    title="Flip camera"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 8px",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Hidden canvas for jsQR frame capture — must be in DOM, not visible */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* ── Camera Viewfinder: video always mounted so ref is never null ── */}
            <div style={{ position: "relative", width: "100%", height: "260px", display: cameraActive ? "flex" : "none", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "12px" }}>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px", background: "#000" }}
              />
              {/* Overlay Scanning Guide Box */}
              <div
                style={{
                  position: "absolute",
                  width: "180px",
                  height: "180px",
                  border: "2px solid rgba(244, 188, 67, 0.4)",
                  borderRadius: "12px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                  pointerEvents: "none",
                }}
              >
                {/* Glowing Laser Scan Line */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, transparent, ${colors.brand.primary}, transparent)`,
                    boxShadow: `0 0 12px ${colors.brand.primary}`,
                    animation: "laserScan 2.4s ease-in-out infinite",
                  }}
                />
                {/* 4 Corners */}
                <div style={{ position: "absolute", top: -2, left: -2, width: 22, height: 22, borderTop: `4px solid ${colors.brand.primary}`, borderLeft: `4px solid ${colors.brand.primary}`, borderRadius: "6px 0 0 0" }} />
                <div style={{ position: "absolute", top: -2, right: -2, width: 22, height: 22, borderTop: `4px solid ${colors.brand.primary}`, borderRight: `4px solid ${colors.brand.primary}`, borderRadius: "0 6px 0 0" }} />
                <div style={{ position: "absolute", bottom: -2, left: -2, width: 22, height: 22, borderBottom: `4px solid ${colors.brand.primary}`, borderLeft: `4px solid ${colors.brand.primary}`, borderRadius: "0 0 0 6px" }} />
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderBottom: `4px solid ${colors.brand.primary}`, borderRight: `4px solid ${colors.brand.primary}`, borderRadius: "0 0 6px 0" }} />
              </div>
            </div>

            {/* Simulated Scanner Box — shown only when camera is OFF */}
            {!cameraActive && (
              <div
                onClick={handleToggleCamera}
                title="Click to activate camera"
                style={{
                  position: "relative",
                  width: "220px",
                  height: "220px",
                  background: "radial-gradient(circle, rgba(35, 114, 165, 0.25) 0%, rgba(12, 42, 66, 0.8) 100%)",
                  borderRadius: "16px",
                  border: "1.5px dashed rgba(244, 188, 67, 0.5)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 0 30px rgba(0,0,0,0.5)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "rgba(244, 188, 67, 0.15)",
                      border: `1.5px solid ${colors.brand.primary}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: colors.brand.primary,
                      marginBottom: "4px",
                    }}
                  >
                    <Camera size={26} />
                  </div>
                  <span style={{ fontSize: "13px", color: "#FFFFFF", letterSpacing: "0.3px", fontWeight: 700 }}>
                    Click to Use Camera
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
                    or enter invoice manually
                  </span>
                </div>
                <div style={{ position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTop: `4px solid ${colors.brand.primary}`, borderLeft: `4px solid ${colors.brand.primary}`, borderRadius: "6px 0 0 0" }} />
                <div style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTop: `4px solid ${colors.brand.primary}`, borderRight: `4px solid ${colors.brand.primary}`, borderRadius: "0 6px 0 0" }} />
                <div style={{ position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottom: `4px solid ${colors.brand.primary}`, borderLeft: `4px solid ${colors.brand.primary}`, borderRadius: "0 0 0 6px" }} />
                <div style={{ position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottom: `4px solid ${colors.brand.primary}`, borderRight: `4px solid ${colors.brand.primary}`, borderRadius: "0 0 6px 0" }} />
              </div>
            )}

            {cameraError && (
              <div style={{ marginTop: "10px", background: "rgba(220, 38, 38, 0.2)", border: "1px solid rgba(220, 38, 38, 0.4)", borderRadius: "6px", padding: "6px 12px", color: "#FCA5A5", fontSize: "12px", textAlign: "center" }}>
                {cameraError}
              </div>
            )}

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                {cameraActive ? "Align invoice QR code inside the viewfinder box" : "Click 'Use Cam' to start webcam QR scanner"}
              </span>
            </div>
          </div>

          {/* RIGHT: Quick Validation & Manual Search Form */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "18px" }}>
            <div>
              <h2 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 700, color: colors.text.primary, display: "flex", alignItems: "center", gap: "8px" }}>
                <Search size={18} color={colors.brand.accent} />
                Validate Invoice or Ticket
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: colors.text.muted }}>
                Enter invoice number, ticket barcode, or choose a quick demo pass to test gate validation.
              </p>

              {/* Manual Entry Form */}
              <form onSubmit={handleManualSubmit} style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. TKT-9021 or INV-2026-8801"
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

            {/* Quick Demo Test Presets */}
            <div style={{ background: "#F8FAFC", border: `1px solid ${colors.header.border}`, borderRadius: "10px", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.primary, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  ⚡ Quick Test Scenarios (1-Click)
                </span>
                <span style={{ fontSize: "11px", color: colors.text.muted }}>Simulates visitor scan</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[
                  { id: "TKT-9021", label: "🟢 Valid (Today - Family)" },
                  { id: "TKT-9022", label: "🟢 Valid (Today - Solo)" },
                  { id: "TKT-9023", label: "🔴 Expired (Yesterday)" },
                  { id: "TKT-9024", label: "🟡 Future Date Pass" },
                  { id: "TKT-9025", label: "🟠 Already Used" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleProcessScan(item.id)}
                    style={{
                      background: "#FFFFFF",
                      border: `1px solid ${colors.header.border}`,
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: colors.text.primary,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.15s ease",
                    }}
                    className="quick-btn"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gate Assistant Tip */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: colors.text.muted }}>
              <Info size={15} color={colors.brand.accent} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>
                <strong>Gate Rule:</strong> Only tickets scheduled for <strong>Today ({formatDisplayDate(todayDateStr)})</strong> are authorized for entry. Past or future tickets must be denied.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ticket Details Rendered Directly Below the Scanner UI ── */}
      <div ref={ticketSectionRef} style={{ scrollMarginTop: "20px" }}>
        {currentTicket ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              border: `1.5px solid ${
                currentTicket.status === "valid"
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
              
              {/* LEFT COLUMN: Visitor, Attraction, and Gate Details */}
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

                {/* Attraction & Gate Card */}
                <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: `1px solid ${colors.header.border}` }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: colors.brand.accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} /> Attraction &amp; Access Zone
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Attraction / Venue</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: colors.text.primary }}>{currentTicket.attraction}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Access Zone</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>{currentTicket.zone}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Designated Gate</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.sidebar.bg }}>{currentTicket.gate}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Time Slot</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>{currentTicket.timeSlot}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted }}>Seat / Bogie Allocations</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: colors.brand.accent }}>
                        {currentTicket.seats || currentTicket.bogie || "General Entry (No Seat)"}
                      </div>
                    </div>
                  </div>
                </div>

                {currentTicket.specialNotes && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#92400E" }}>
                    <strong>Note:</strong> {currentTicket.specialNotes}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Ticket Breakdown, Amount & Gate Action Controls */}
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
                    Gate Validator Action
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
                        Click <strong>"Next Scan"</strong> at the bottom right to validate the next visitor in queue.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Primary Allow Button */}
                      <button
                        onClick={handleAllowEntry}
                        disabled={currentTicket.status !== "valid"}
                        style={{
                          background: currentTicket.status === "valid" ? "#16A34A" : "#94A3B8",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "8px",
                          padding: "14px 20px",
                          fontFamily: typography.fontFamily.sans,
                          fontWeight: 700,
                          fontSize: "15px",
                          cursor: currentTicket.status === "valid" ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: currentTicket.status === "valid" ? "0 4px 14px rgba(22, 163, 74, 0.3)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Check size={20} />
                        <span>Allow Entry / Admit Visitor</span>
                      </button>

                      {/* Deny / Reject Button */}
                      <button
                        onClick={() => setShowRejectModal(true)}
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

          <button
            onClick={() => setScanHistory([])}
            style={{
              background: "none",
              border: "none",
              color: colors.text.muted,
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear Log
          </button>
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
              {scanHistory.map((item) => (
                <tr key={item.id} style={{ borderTop: `1px solid ${colors.header.border}` }}>
                  <td style={{ padding: "12px 18px", color: colors.text.muted, fontWeight: 500 }}>{item.timestamp}</td>
                  <td style={{ padding: "12px 18px", fontWeight: 700, color: colors.sidebar.bg }}>{item.ticketId}</td>
                  <td style={{ padding: "12px 18px", fontWeight: 600, color: colors.text.primary }}>{item.visitorName}</td>
                  <td style={{ padding: "12px 18px", color: colors.text.primary }}>{item.attraction}</td>
                  <td style={{ padding: "12px 18px", fontWeight: 600 }}>{item.visitorsCount} Pax</td>
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
                        background: item.verdict === "Allowed" ? "#DCFCE7" : "#FEE2E2",
                        color: item.verdict === "Allowed" ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {item.verdict === "Allowed" ? <Check size={12} /> : <X size={12} />}
                      {item.verdict}
                      {item.reason && ` (${item.reason})`}
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
              ))}
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
              {[
                "Date Mismatch / Expired Ticket",
                "Future Date Ticket (Not Valid Today)",
                "Already Used / Duplicate Entry Attempt",
                "Unrecognized / Fake QR Code",
                "Incorrect Gate / Venue Access",
                "Payment Disputed / Pending",
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleRejectEntry(reason)}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.header.border}`,
                    background: "#F8FAFC",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: colors.text.primary,
                    cursor: "pointer",
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
        .quick-btn:hover {
          background: #EFF6FF !important;
          border-color: ${colors.brand.accent} !important;
          transform: translateY(-1px);
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
