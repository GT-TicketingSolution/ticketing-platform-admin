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
  SwitchCamera,
  Zap,
  ZapOff,
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
  fetchTicketDetails,
  useAdmitTicketMutation,
  useRejectTicketMutation,
  type ScannerTicketDetails,
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

  // Camera feed states & device management
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [isFlippingCamera, setIsFlippingCamera] = useState(false);
  const [cameraLabel, setCameraLabel] = useState<string>("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchActive, setTorchActive] = useState(false);

  // React Query Mutations for Server APIs
  const admitMutation = useAdmitTicketMutation();
  const rejectMutation = useRejectTicketMutation();

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>("");
  const scanCooldownRef = useRef<boolean>(false);
  const currentFacingRef = useRef<"environment" | "user">("environment");
  const activeDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = "Ticket Scanner | Ticketing Solution";
  }, []);

  // Enumerate all available camera devices (e.g. front, back, wide-angle)
  const refreshVideoDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(videoInputs);
        return videoInputs;
      }
    } catch {
      // ignore
    }
    return [];
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

  // Cleanly stop any active media tracks and reset stream
  const stopCameraTracks = useCallback(() => {
    stopScanLoop();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchActive(false);
    setTorchSupported(false);
    setCameraActive(false);
  }, [stopScanLoop]);

  // Start / Switch Camera Stream with target facing mode and optional device ID
  const startCamera = async (targetFacing?: "environment" | "user", targetDeviceId?: string) => {
    setCameraError(null);
    setIsFlippingCamera(true);

    // Stop current stream cleanly to release hardware lock on mobile
    stopCameraTracks();

    const facingToUse = targetFacing ?? currentFacingRef.current;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera is not supported on this browser. Please use manual entry below.");
        setIsFlippingCamera(false);
        return;
      }

      let stream: MediaStream | null = null;

      // Strategy 1: If explicit targetDeviceId is specified, try that first
      if (targetDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = null;
        }
      }

      // Strategy 2: Request with ideal facingMode
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingToUse },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Strategy 3: Fallback without resolution constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facingToUse },
              audio: false,
            });
          } catch {
            // Strategy 4: Ultimate fallback: any available camera video input
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }
      }

      if (!stream) {
        throw new Error("Unable to obtain camera feed.");
      }

      mediaStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings ? videoTrack.getSettings() : ({} as MediaTrackSettings);
        const actualFacing = (settings.facingMode as "environment" | "user") || facingToUse;
        setCameraFacing(actualFacing);
        currentFacingRef.current = actualFacing;
        activeDeviceIdRef.current = settings.deviceId || targetDeviceId || null;
        setCameraLabel(videoTrack.label || (actualFacing === "user" ? "Front Camera" : "Back Camera"));

        // Check if torch / flashlight is supported
        try {
          const trackAny = videoTrack as MediaStreamTrack & { getCapabilities?: () => { torch?: boolean } };
          const capabilities = trackAny.getCapabilities ? trackAny.getCapabilities() : null;
          if (capabilities && "torch" in capabilities) {
            setTorchSupported(true);
          } else {
            setTorchSupported(false);
          }
        } catch {
          setTorchSupported(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => { });
          startScanLoop((decoded) => handleProcessScan(decoded));
        };
      }

      setCameraActive(true);
      await refreshVideoDevices();
    } catch (err: unknown) {
      const error = err as Error;
      const msg =
        error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser or device settings."
          : error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError"
            ? "No camera found on this device."
            : error?.name === "NotReadableError" || error?.name === "TrackStartError"
              ? "Camera is currently busy or in use by another app. Please close other camera tabs and try again."
              : error?.message || "Unable to access camera. Please allow camera permissions.";
      setCameraError(msg);
      setCameraActive(false);
    } finally {
      setIsFlippingCamera(false);
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
  };

  const handleToggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Flip camera between front (user) and rear (environment) or cycle available camera lenses
  const handleFlipCamera = async () => {
    if (isFlippingCamera) return;

    // Refresh devices list
    const devices = videoDevices.length > 0 ? videoDevices : await refreshVideoDevices();

    if (devices.length > 1) {
      // Find current device index and advance to next
      const currentIdx = devices.findIndex((d) => d.deviceId === activeDeviceIdRef.current);
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % devices.length : 0;
      const nextDevice = devices[nextIdx];

      // Guess facing mode from device label if available
      const label = (nextDevice.label || "").toLowerCase();
      let nextFacing: "environment" | "user" =
        currentFacingRef.current === "environment" ? "user" : "environment";
      if (label.includes("back") || label.includes("rear") || label.includes("environment")) {
        nextFacing = "environment";
      } else if (label.includes("front") || label.includes("user") || label.includes("selfie")) {
        nextFacing = "user";
      }

      setCameraFacing(nextFacing);
      currentFacingRef.current = nextFacing;
      await startCamera(nextFacing, nextDevice.deviceId);
    } else {
      // Standard facing mode toggle
      const nextFacing = currentFacingRef.current === "environment" ? "user" : "environment";
      setCameraFacing(nextFacing);
      currentFacingRef.current = nextFacing;
      await startCamera(nextFacing);
    }
  };

  // Toggle Torch / Flashlight for dark / low-light gate environments
  const handleToggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchActive;
      const trackAny = track as MediaStreamTrack & {
        applyConstraints?: (constraints: { advanced: Array<{ torch?: boolean }> }) => Promise<void>;
      };
      if (trackAny.applyConstraints) {
        await trackAny.applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchActive(nextTorch);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

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
      } catch {
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

  const isAllowButtonEnabled =
    Boolean(currentTicket && currentTicket.status === "valid" && currentTicket.paymentStatus === "Paid") &&
    !admitMutation.isPending;

  return (
    <div className="scanner-page-container">
      {/* ── Page Header ── */}
      <div className="scanner-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <div className="scanner-header-icon">
            <ScanLine size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <h1 className="scanner-page-title">
                QR Ticket &amp; Invoice Scanner
              </h1>
              <span className="scanner-live-badge">
                Live Gate Ready
              </span>
            </div>
            <p className="scanner-page-subtitle">
              Scan invoice QR or enter ticket ID for <strong style={{ color: colors.brand.accent }}>Today ({formatDisplayDate(todayDateStr)})</strong>.
            </p>
          </div>
        </div>

        {/* Top Controls: Today Date */}
        <div className="scanner-today-pill">
          <Clock size={16} color={colors.brand.accent} />
          <span>Today: {formatDisplayDate(todayDateStr)}</span>
        </div>
      </div>

      {/* ── Main Scanner Area (Expanded Big Viewfinder on Left + Validate Invoice / Ticket Form on Right) ── */}
      <div className="scanner-card">
        <div className="scanner-main-grid">
          {/* LEFT: Prominent Big QR Code Camera & Viewfinder Box */}
          <div className="scanner-left-box">
            {/* Viewfinder Header Controls Toolbar */}
            <div className="scanner-viewfinder-toolbar">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                <div className="scanner-status-pill">
                  <div className={`scanner-pulse-dot ${isScanningActive ? "pulse" : ""}`} />
                  <span className="scanner-status-text">
                    {cameraActive ? "Live Scanner Active" : "Camera Scanner"}
                  </span>
                </div>

                {cameraActive && (
                  <span className={`scanner-cam-mode-tag ${cameraFacing === "user" ? "front-cam" : "back-cam"}`}>
                    {cameraFacing === "user" ? "🤳 Front Camera" : "📷 Back Camera"}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {cameraActive && torchSupported && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    title={torchActive ? "Turn Flash Off" : "Turn Flash On"}
                    className={`scanner-torch-btn ${torchActive ? "active" : ""}`}
                  >
                    {torchActive ? <Zap size={16} /> : <ZapOff size={16} />}
                  </button>
                )}

                {cameraActive && (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    disabled={isFlippingCamera}
                    title={`Flip camera (${cameraFacing === "environment" ? "Switch to Front" : "Switch to Back"})`}
                    className={`scanner-flip-btn ${isFlippingCamera ? "flipping" : ""}`}
                  >
                    <SwitchCamera size={16} className={isFlippingCamera ? "spin-infinite" : ""} />
                    <span>Flip Cam</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className={`scanner-cam-btn ${cameraActive ? "active" : ""}`}
                >
                  {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
                  <span>{cameraActive ? "Stop Camera" : "Start Live Cam"}</span>
                </button>
              </div>
            </div>

            {/* Hidden canvas for jsQR frame capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Large Prominent Camera Viewfinder with Big Targeting Square */}
            <div className={`scanner-video-wrapper ${cameraActive ? "is-active" : ""}`}>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`scanner-video-el ${cameraFacing === "user" ? "mirror-cam" : ""}`}
              />

              {/* In-viewfinder camera mode badge */}
              {cameraActive && (
                <div className="scanner-viewfinder-top-badge">
                  <div className="scanner-rec-dot" />
                  <span>{cameraFacing === "user" ? "FRONT SELFIE CAM" : "REAR HD CAM"}</span>
                </div>
              )}

              {/* Floating Quick Action Overlay Buttons (Thumb accessible on Mobile) */}
              {cameraActive && (
                <div className="scanner-floating-overlay-controls">
                  {torchSupported && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`scanner-floating-action-btn ${torchActive ? "active" : ""}`}
                      title={torchActive ? "Turn Flash Off" : "Turn Flash On"}
                    >
                      {torchActive ? <Zap size={18} /> : <ZapOff size={18} />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    disabled={isFlippingCamera}
                    className={`scanner-floating-action-btn flip-btn ${isFlippingCamera ? "flipping" : ""}`}
                    title="Flip camera"
                  >
                    <SwitchCamera size={20} className={isFlippingCamera ? "spin-infinite" : ""} />
                    <span className="floating-btn-text">
                      {cameraFacing === "environment" ? "Front" : "Back"}
                    </span>
                  </button>
                </div>
              )}

              {/* Switching Camera Smooth Spinner Overlay */}
              {isFlippingCamera && (
                <div className="scanner-flipping-overlay">
                  <RefreshCw size={28} className="spin-infinite" color={colors.brand.primary} />
                  <span>Switching Camera...</span>
                </div>
              )}

              <div className="scanner-laser-box">
                <div className="scanner-laser-line" />
                <div className="scanner-corner corner-tl" />
                <div className="scanner-corner corner-tr" />
                <div className="scanner-corner corner-bl" />
                <div className="scanner-corner corner-br" />
                <div className="scanner-center-crosshair">
                  <ScanLine size={32} color={colors.brand.primary} style={{ opacity: 0.6 }} />
                </div>
              </div>
            </div>

            {/* Interactive Scanner Box — shown when camera is OFF */}
            {!cameraActive && (
              <div
                onClick={handleToggleCamera}
                title="Click to activate camera"
                className="scanner-placeholder-box"
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
                  <div className="scanner-cam-icon-circle">
                    <Camera size={36} />
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", color: "#FFFFFF", fontWeight: 800 }}>
                      Tap to Open Live Camera Scanner
                    </div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: "4px" }}>
                      Instant auto-focus barcode and invoice QR detection
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCamera();
                    }}
                    className="scanner-start-cta-btn"
                  >
                    <Camera size={18} />
                    <span>Launch Camera Scanner</span>
                  </button>
                </div>
                <div className="scanner-corner corner-tl" />
                <div className="scanner-corner corner-tr" />
                <div className="scanner-corner corner-bl" />
                <div className="scanner-corner corner-br" />
              </div>
            )}

            {cameraError && (
              <div className="scanner-cam-error-box">
                {cameraError}
              </div>
            )}

            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                {cameraActive ? "Hold QR code inside the yellow box for instant gate verification" : "Click box above or 'Start Live Cam' for high-speed scanning"}
              </span>
            </div>
          </div>

          {/* RIGHT: Validation & Manual Search Form */}
          <div className="scanner-right-box">
            <div>
              <h2 className="scanner-form-title">
                <Search size={18} color={colors.brand.accent} />
                Validate Invoice or Ticket
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: colors.text.muted }}>
                Enter invoice number or ticket barcode to instantly validate gate admission.
              </p>

              {/* Manual Entry Form */}
              <form onSubmit={handleManualSubmit} className="scanner-manual-form">
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter Ticket ID / Invoice No / QR Code…"
                    className="scanner-manual-input"
                  />
                  {manualInput && (
                    <button
                      type="button"
                      onClick={() => setManualInput("")}
                      className="scanner-clear-input-btn"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!manualInput.trim() || isProcessing}
                  className={`scanner-submit-btn ${manualInput.trim() && !isProcessing ? "active" : "disabled"}`}
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
            <div className="scanner-helper-card">
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
            <div className="scanner-gate-tip">
              <Info size={15} color="#CA8A04" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ color: "#854D0E" }}>
                <strong>Gate Rule:</strong> Only tickets scheduled for <strong>Today ({formatDisplayDate(todayDateStr)})</strong> are authorized for entry.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ticket Details Rendered Directly Below Scanner ── */}
      <div ref={ticketSectionRef} style={{ scrollMarginTop: "20px" }}>
        {isProcessing ? (
          <div className="scanner-card" style={{ padding: "24px" }}>
            <div className="scanner-sk" style={{ width: "100%", height: "48px", borderRadius: "8px", marginBottom: "16px" }} />
            <div className="scanner-details-grid">
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
            className={`scanner-result-card border-${currentTicket.status === "valid" ? "valid" : currentTicket.status === "used" ? "used" : currentTicket.status === "future" ? "future" : "invalid"}`}
          >
            {/* Dynamic Status Header Banner */}
            <div
              className={`scanner-result-header bg-${currentTicket.status === "valid" ? "valid" : currentTicket.status === "used" ? "used" : currentTicket.status === "future" ? "future" : "invalid"}`}
            >
              <div className="scanner-result-header-left">
                <div className="scanner-result-status-icon">
                  {currentTicket.status === "valid" && <Check size={26} color="#FFFFFF" strokeWidth={3} />}
                  {currentTicket.status === "used" && <AlertTriangle size={24} color="#FFFFFF" />}
                  {currentTicket.status === "future" && <Clock size={24} color="#FFFFFF" />}
                  {currentTicket.status === "expired" && <CalendarX size={24} color="#FFFFFF" />}
                  {currentTicket.status === "invalid" && <X size={26} color="#FFFFFF" strokeWidth={3} />}
                  {currentTicket.status === "cancelled" && <X size={26} color="#FFFFFF" strokeWidth={3} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="scanner-result-title">
                    {currentTicket.status === "valid" && "✓ TICKET VALID — READY TO ALLOW"}
                    {currentTicket.status === "used" && "⚠ ALREADY USED / CHECKED-IN"}
                    {currentTicket.status === "future" && "⏳ FUTURE DATE TICKET — NOT VALID TODAY"}
                    {currentTicket.status === "expired" && "✕ EXPIRED TICKET — DATE PASSED"}
                    {currentTicket.status === "invalid" && "✕ INVALID TICKET — NOT RECOGNIZED"}
                    {currentTicket.status === "cancelled" && "✕ CANCELLED BOOKING — ENTRY DENIED"}
                  </div>
                  <div className="scanner-result-subtitle">
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
              <div className="scanner-code-badge">
                <div className="scanner-code-badge-label">SCANNED CODE</div>
                <div className="scanner-code-badge-val">{currentTicket.id}</div>
              </div>
            </div>

            {/* Strict Date Validation Alert Card */}
            <div className={`scanner-date-bar ${isDateToday ? "date-pass" : "date-fail"}`}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                {isDateToday ? (
                  <CalendarCheck size={22} color="#16A34A" style={{ flexShrink: 0 }} />
                ) : (
                  <CalendarX size={22} color="#DC2626" style={{ flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: isDateToday ? "#16A34A" : "#DC2626" }}>
                    {isDateToday
                      ? "✓ Date Verification PASSED"
                      : "✕ Date Verification FAILED"}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "2px", wordBreak: "break-word" }}>
                    Ticket Date: <strong>{formatDisplayDate(currentTicket.visitDate)}</strong> | Gate Current Date: <strong>{formatDisplayDate(todayDateStr)}</strong>
                  </div>
                </div>
              </div>

              <div className={`scanner-date-pill ${isDateToday ? "pill-pass" : "pill-fail"}`}>
                {isDateToday ? "TODAY'S SLOT MATCH" : "DATE MISMATCH"}
              </div>
            </div>

            {/* Ticket Information Body */}
            <div className="scanner-details-grid">
              {/* LEFT COLUMN: Visitor and Attraction Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Visitor Card */}
                <div className="scanner-info-card">
                  <div className="scanner-card-section-head">
                    <User size={15} /> PRIMARY VISITOR INFORMATION
                  </div>

                  <div className="scanner-sub-grid">
                    <div>
                      <div className="scanner-field-label">Visitor Name</div>
                      <div className="scanner-field-val" style={{ fontSize: "15px", fontWeight: 700 }}>{currentTicket.visitorName}</div>
                    </div>
                    <div>
                      <div className="scanner-field-label">Visitor Category</div>
                      <div className="scanner-field-val">
                        <span style={{ background: "#E2E8F0", padding: "2px 8px", borderRadius: "4px", fontSize: "12px" }}>
                          {currentTicket.visitorType}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="scanner-field-label">Phone Number</div>
                      <div className="scanner-field-val">{currentTicket.mobileNumber}</div>
                    </div>
                    <div>
                      <div className="scanner-field-label">Email</div>
                      <div className="scanner-field-val" style={{ wordBreak: "break-all" }}>{currentTicket.email}</div>
                    </div>
                  </div>
                </div>

                {/* Attraction Card */}
                <div className="scanner-info-card">
                  <div className="scanner-card-section-head">
                    <MapPin size={15} /> ATTRACTION DETAILS
                  </div>

                  <div className="scanner-sub-grid">
                    <div>
                      <div className="scanner-field-label">Attraction</div>
                      <div className="scanner-field-val" style={{ fontSize: "14px", fontWeight: 700 }}>{currentTicket.attraction}</div>
                    </div>
                    <div>
                      <div className="scanner-field-label">Time Slot</div>
                      <div className="scanner-field-val">{currentTicket.timeSlot}</div>
                    </div>
                  </div>
                </div>

                {currentTicket.specialNotes && (
                  <div className="scanner-special-notes">
                    <strong>Note:</strong> {currentTicket.specialNotes}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Ticket Breakdown, Amount & Action Controls */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}>
                {/* Breakdown Table */}
                <div className="scanner-info-card">
                  <div className="scanner-card-section-head" style={{ justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <TicketIcon size={15} /> VISITORS BREAKDOWN
                    </span>
                    <span className="scanner-total-pill">
                      TOTAL: {currentTicket.totalVisitors} {currentTicket.totalVisitors === 1 ? "PERSON" : "PERSONS"}
                    </span>
                  </div>

                  {currentTicket.breakdown.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {currentTicket.breakdown.map((item, idx) => (
                        <div key={idx} className="scanner-breakdown-row">
                          <div style={{ fontWeight: 600, color: colors.text.primary }}>
                            {item.quantity}x {item.category}
                          </div>
                          <div style={{ color: colors.text.muted, fontWeight: 600 }}>
                            ₹{item.total}
                          </div>
                        </div>
                      ))}

                      <div className="scanner-breakdown-total">
                        <span style={{ color: colors.text.primary }}>Total Paid ({currentTicket.paymentMode})</span>
                        <span style={{ fontSize: "16px", color: "#16A34A" }}>₹{currentTicket.totalAmount}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: colors.text.muted, fontSize: "13px", padding: "8px 0" }}>No item breakdown available.</div>
                  )}
                </div>

                {/* Validation Verdict Action Buttons */}
                <div className="scanner-action-card">
                  <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                    VALIDATOR ACTION
                  </div>

                  {scanVerdict ? (
                    <div className={`scanner-verdict-banner ${scanVerdict === "Allowed" ? "verdict-pass" : "verdict-fail"}`}>
                      <div className="scanner-verdict-title">
                        {scanVerdict === "Allowed" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        <span>{scanVerdict === "Allowed" ? "Visitor Admitted Successfully ✓" : "Entry Denied ✕"}</span>
                      </div>
                      {rejectionReason && (
                        <div style={{ fontSize: "12px", color: "#991B1B", marginTop: "4px" }}>
                          Reason: {rejectionReason}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleNextScan}
                        className="scanner-inline-next-btn"
                      >
                        <RotateCcw size={16} />
                        <span>Scan Next Visitor</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Primary Allow Button */}
                      <button
                        type="button"
                        onClick={handleAllowEntry}
                        disabled={!isAllowButtonEnabled}
                        className={`scanner-allow-btn ${isAllowButtonEnabled ? "active" : "disabled"}`}
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
                        type="button"
                        onClick={() => setShowRejectModal(true)}
                        disabled={rejectMutation.isPending}
                        className="scanner-reject-btn"
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
          <div className="scanner-card scanner-empty-state">
            <div className="scanner-empty-icon-circle">
              <TicketIcon size={32} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: colors.text.primary }}>
                Waiting for QR Scan
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: colors.text.muted, maxWidth: "420px", lineHeight: "18px" }}>
                Scan a visitor invoice QR code or enter ticket ID above to validate entry and view details.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── REJECTION REASON MODAL ── */}
      {showRejectModal && (
        <div className="scanner-modal-backdrop">
          <div className="scanner-modal-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#DC2626", fontWeight: 700, fontSize: "16px" }}>
                <XCircle size={22} /> Deny Entry / Specify Reason
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ background: "none", border: "none", color: colors.text.muted, cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: colors.text.muted, margin: "0 0 14px 0" }}>
              Please select the primary reason for denying visitor access:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleRejectEntry(reason)}
                  disabled={rejectMutation.isPending}
                  className="reject-reason-btn"
                >
                  {reason}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              disabled={rejectMutation.isPending}
              className="scanner-modal-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── PROMINENT BOTTOM "NEXT SCAN" FLOATING BUTTON (Always Visible) ── */}
      <div className="scanner-next-float-container">
        <button
          type="button"
          onClick={handleNextScan}
          title="Reset scanner for next visitor (Shortcut: Space)"
          className="next-scan-btn"
        >
          <RotateCcw size={18} style={{ strokeWidth: 2.5 }} />
          <span>Next Scan / Next Visitor</span>
          <ArrowRight size={18} style={{ strokeWidth: 2.5 }} />
          <span className="scanner-space-badge">
            SPACE
          </span>
        </button>
      </div>

      {/* ── Custom Mobile-First CSS & Animations ── */}
      <style>{`
        .scanner-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 8px 0 60px 0;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .scanner-header-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justifyContent: space-between;
          gap: 12px;
          padding: 0 4px;
        }

        .scanner-header-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, ${colors.sidebar.bg} 0%, #1A496E 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.brand.primary};
          box-shadow: 0 4px 12px rgba(12, 42, 66, 0.2);
          flex-shrink: 0;
        }

        .scanner-page-title {
          font-family: ${typography.fontFamily.sans};
          font-weight: 800;
          font-size: 20px;
          color: ${colors.text.primary};
          margin: 0;
          line-height: 1.25;
        }

        .scanner-live-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #DCFCE7;
          color: #16A34A;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #BBF7D0;
        }

        .scanner-page-subtitle {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: ${colors.text.muted};
          line-height: 1.35;
        }

        .scanner-today-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid ${colors.header.border};
          font-size: 13px;
          color: ${colors.text.primary};
          font-weight: 600;
        }

        .scanner-card {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid ${colors.header.border};
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .scanner-main-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          min-height: 440px;
        }

        .scanner-left-box {
          background: ${colors.sidebar.bg};
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          position: relative;
          box-sizing: border-box;
          width: 100%;
        }

        .scanner-viewfinder-toolbar {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .scanner-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          padding: 6px 14px;
          border-radius: 20px;
          min-width: 0;
        }

        .scanner-status-text {
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .scanner-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9CA3AF;
          flex-shrink: 0;
        }
        .scanner-pulse-dot.pulse {
          background: #22C55E;
          animation: pulseDot 1.5s infinite;
        }

        /* By default (Desktop / PC / Laptop), hide camera flip, torch, and mobile badges */
        .scanner-cam-mode-tag {
          display: none;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          letter-spacing: 0.3px;
          white-space: nowrap;
          animation: fadeInSlide 0.2s ease-out;
        }
        .scanner-cam-mode-tag.back-cam {
          background: rgba(34, 197, 94, 0.18);
          color: #4ADE80;
          border: 1px solid rgba(74, 222, 128, 0.35);
        }
        .scanner-cam-mode-tag.front-cam {
          background: rgba(244, 188, 67, 0.2);
          color: #FDE047;
          border: 1px solid rgba(244, 188, 67, 0.4);
        }

        .scanner-cam-btn {
          background: rgba(255,255,255,0.18);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .scanner-cam-btn.active {
          background: ${colors.brand.primary};
          color: ${colors.sidebar.bg};
          box-shadow: 0 4px 12px rgba(244, 188, 67, 0.4);
        }
        .scanner-cam-btn:hover {
          opacity: 0.92;
        }

        .scanner-torch-btn {
          display: none;
          background: rgba(255,255,255,0.18);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .scanner-torch-btn.active {
          background: #EAB308;
          color: #000000;
          box-shadow: 0 0 14px rgba(234, 179, 8, 0.7);
        }

        .scanner-flip-btn {
          display: none;
          background: rgba(255,255,255,0.18);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .scanner-flip-btn:hover {
          background: rgba(255,255,255,0.28);
          transform: translateY(-1px);
        }
        .scanner-flip-btn:active {
          transform: translateY(1px);
        }
        .scanner-flip-btn.flipping {
          opacity: 0.7;
          pointer-events: none;
        }

        /* ── BIG EXPANDED VIDEO VIEWFINDER FOR RAPID SCANNING ── */
        .scanner-video-wrapper {
          position: relative;
          width: 100%;
          height: 380px;
          display: none;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 14px;
          background: #000000;
          box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
        }
        .scanner-video-wrapper.is-active {
          display: flex;
        }

        .scanner-video-el {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 14px;
          transition: transform 0.3s ease;
        }
        .scanner-video-el.mirror-cam {
          transform: scaleX(-1);
        }

        .scanner-viewfinder-top-badge {
          display: none;
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          padding: 5px 10px;
          border-radius: 6px;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.15);
          z-index: 10;
          pointer-events: none;
        }

        .scanner-rec-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #DC2626;
          box-shadow: 0 0 6px #DC2626;
          animation: pulseDot 1.2s infinite;
        }

        /* Floating quick action buttons for thumb reach on mobile / tablet */
        .scanner-floating-overlay-controls {
          display: none;
          position: absolute;
          bottom: 16px;
          right: 16px;
          align-items: center;
          gap: 10px;
          z-index: 20;
        }

        .scanner-floating-action-btn {
          background: rgba(1, 27, 47, 0.8);
          backdrop-filter: blur(10px);
          color: #FFFFFF;
          border: 1.5px solid rgba(244, 188, 67, 0.6);
          border-radius: 50px;
          padding: 10px 14px;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scanner-floating-action-btn:hover {
          background: rgba(12, 42, 66, 0.95);
          border-color: ${colors.brand.primary};
          transform: scale(1.05);
        }
        .scanner-floating-action-btn:active {
          transform: scale(0.95);
        }
        .scanner-floating-action-btn.active {
          background: #EAB308;
          color: #011B2F;
          border-color: #FDE047;
          box-shadow: 0 0 16px rgba(234, 179, 8, 0.6);
        }
        .scanner-floating-action-btn.flipping {
          opacity: 0.7;
          pointer-events: none;
        }

        .scanner-flipping-overlay {
          position: absolute;
          inset: 0;
          background: rgba(1, 27, 47, 0.75);
          backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 700;
          z-index: 30;
          animation: fadeInSlide 0.15s ease-out;
        }

        .spin-infinite {
          animation: spin 0.75s linear infinite;
        }

        /* ── LARGE TARGETING SQUARE WITH SHADOW CUTOUT ── */
        .scanner-laser-box {
          position: absolute;
          width: 270px;
          height: 270px;
          border: 2.5px solid rgba(244, 188, 67, 0.65);
          border-radius: 16px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scanner-center-crosshair {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scanner-laser-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, ${colors.brand.primary}, transparent);
          box-shadow: 0 0 16px ${colors.brand.primary}, 0 0 8px ${colors.brand.primary};
          animation: laserScan 2.4s ease-in-out infinite;
        }

        .scanner-corner {
          position: absolute;
          width: 28px;
          height: 28px;
        }
        .corner-tl { top: -3px; left: -3px; border-top: 5px solid ${colors.brand.primary}; border-left: 5px solid ${colors.brand.primary}; border-radius: 8px 0 0 0; }
        .corner-tr { top: -3px; right: -3px; border-top: 5px solid ${colors.brand.primary}; border-right: 5px solid ${colors.brand.primary}; border-radius: 0 8px 0 0; }
        .corner-bl { bottom: -3px; left: -3px; border-bottom: 5px solid ${colors.brand.primary}; border-left: 5px solid ${colors.brand.primary}; border-radius: 0 0 0 8px; }
        .corner-br { bottom: -3px; right: -3px; border-bottom: 5px solid ${colors.brand.primary}; border-right: 5px solid ${colors.brand.primary}; border-radius: 0 0 8px 0; }

        /* ── BIG INTERACTIVE PLACEHOLDER BOX ── */
        .scanner-placeholder-box {
          position: relative;
          width: 100%;
          height: 360px;
          background: radial-gradient(circle, rgba(35, 114, 165, 0.32) 0%, rgba(12, 42, 66, 0.9) 100%);
          border-radius: 14px;
          border: 2px dashed rgba(244, 188, 67, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 45px rgba(0,0,0,0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 24px 16px;
          box-sizing: border-box;
        }
        .scanner-placeholder-box:hover {
          border-color: ${colors.brand.primary};
          background: radial-gradient(circle, rgba(35, 114, 165, 0.42) 0%, rgba(12, 42, 66, 0.95) 100%);
        }

        .scanner-cam-icon-circle {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: rgba(244, 188, 67, 0.2);
          border: 2.5px solid ${colors.brand.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.brand.primary};
          box-shadow: 0 4px 20px rgba(244, 188, 67, 0.3);
        }

        .scanner-start-cta-btn {
          margin-top: 6px;
          background: ${colors.brand.primary};
          color: ${colors.sidebar.bg};
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-family: ${typography.fontFamily.sans};
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(244, 188, 67, 0.35);
          transition: all 0.15s ease;
        }
        .scanner-start-cta-btn:hover {
          transform: translateY(-1px);
        }

        .scanner-cam-error-box {
          margin-top: 12px;
          background: rgba(220, 38, 38, 0.2);
          border: 1px solid rgba(220, 38, 38, 0.4);
          border-radius: 8px;
          padding: 8px 14px;
          color: #FCA5A5;
          font-size: 12px;
          text-align: center;
        }

        .scanner-right-box {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
        }

        .scanner-form-title {
          margin: 0 0 4px 0;
          font-size: 17px;
          font-weight: 700;
          color: ${colors.text.primary};
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scanner-manual-form {
          margin-top: 14px;
          display: flex;
          gap: 8px;
        }

        .scanner-manual-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1.5px solid ${colors.header.border};
          font-family: ${typography.fontFamily.sans};
          font-size: 14px;
          font-weight: 600;
          color: ${colors.text.primary};
          text-transform: uppercase;
          outline: none;
          box-sizing: border-box;
          background: #F8FAFC;
          min-height: 44px;
        }

        .scanner-clear-input-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
        }

        .scanner-submit-btn {
          border: none;
          border-radius: 8px;
          padding: 11px 18px;
          font-family: ${typography.fontFamily.sans};
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s ease;
          min-height: 44px;
        }
        .scanner-submit-btn.active {
          background: ${colors.brand.primary};
          color: ${colors.sidebar.bg};
          cursor: pointer;
        }
        .scanner-submit-btn.disabled {
          background: #E2E8F0;
          color: #94A3B8;
          cursor: not-allowed;
        }

        .scanner-helper-card {
          background: #F8FAFC;
          border: 1px solid ${colors.header.border};
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .scanner-gate-tip {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: ${colors.text.muted};
          background: #FEF9C3;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #FEF08A;
        }

        .scanner-result-card {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          overflow: hidden;
          animation: fadeInSlide 0.3s ease-out;
        }
        .scanner-result-card.border-valid { border: 1.5px solid #22C55E; }
        .scanner-result-card.border-used { border: 1.5px solid #EA580C; }
        .scanner-result-card.border-future { border: 1.5px solid #EAB308; }
        .scanner-result-card.border-invalid { border: 1.5px solid #DC2626; }

        .scanner-result-header {
          color: #FFFFFF;
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .scanner-result-header.bg-valid { background: #16A34A; }
        .scanner-result-header.bg-used { background: #EA580C; }
        .scanner-result-header.bg-future { background: #CA8A04; }
        .scanner-result-header.bg-invalid { background: #DC2626; }

        .scanner-result-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .scanner-result-status-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.1);
        }

        .scanner-result-title {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.2px;
          word-break: break-word;
        }

        .scanner-result-subtitle {
          font-size: 13px;
          opacity: 0.92;
          margin-top: 2px;
          word-break: break-word;
        }

        .scanner-code-badge {
          background: rgba(0, 0, 0, 0.3);
          padding: 6px 14px;
          border-radius: 8px;
          text-align: right;
          flex-shrink: 0;
        }
        .scanner-code-badge-label {
          font-size: 10px;
          text-transform: uppercase;
          opacity: 0.85;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .scanner-code-badge-val {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-top: 1px;
        }

        .scanner-date-bar {
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .scanner-date-bar.date-pass {
          background: #F0FDF4;
          border-bottom: 1px solid #BBF7D0;
        }
        .scanner-date-bar.date-fail {
          background: #FFF5F5;
          border-bottom: 1px solid #FED7D7;
        }

        .scanner-date-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          flex-shrink: 0;
        }
        .scanner-date-pill.pill-pass {
          background: #DCFCE7;
          color: #15803D;
          border: 1px solid #86EFAC;
        }
        .scanner-date-pill.pill-fail {
          background: #FEE2E2;
          color: #B91C1C;
          border: 1px solid #FCA5A5;
        }

        .scanner-details-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
        }

        .scanner-info-card {
          background: #F8FAFC;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid ${colors.header.border};
        }

        .scanner-card-section-head {
          font-size: 12px;
          font-weight: 700;
          color: ${colors.brand.accent};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .scanner-sub-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .scanner-field-label {
          font-size: 11px;
          color: ${colors.text.muted};
        }
        .scanner-field-val {
          font-size: 13px;
          font-weight: 600;
          color: ${colors.text.primary};
          margin-top: 2px;
        }

        .scanner-special-notes {
          background: #FEFCE8;
          border: 1px solid #FEF08A;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          color: #854D0E;
        }

        .scanner-total-pill {
          background: #F59E0B;
          color: #78350F;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
        }

        .scanner-breakdown-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: #FFFFFF;
          border-radius: 6px;
          border: 1px solid ${colors.header.border};
          fontSize: 13px;
        }

        .scanner-breakdown-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          margin-top: 6px;
          border-top: 1.5px dashed ${colors.header.border};
          font-size: 14px;
          font-weight: 700;
        }

        .scanner-action-card {
          background: #FFFFFF;
          border-radius: 12px;
          border: 1.5px solid ${colors.header.border};
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }

        .scanner-verdict-banner {
          padding: 14px;
          border-radius: 8px;
          text-align: center;
        }
        .scanner-verdict-banner.verdict-pass {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
        }
        .scanner-verdict-banner.verdict-fail {
          background: #FEF2F2;
          border: 1px solid #FECACA;
        }

        .scanner-verdict-title {
          font-size: 15px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .verdict-pass .scanner-verdict-title { color: #16A34A; }
        .verdict-fail .scanner-verdict-title { color: #DC2626; }

        .scanner-inline-next-btn {
          margin-top: 12px;
          width: 100%;
          background: ${colors.brand.primary};
          color: ${colors.sidebar.bg};
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-family: ${typography.fontFamily.sans};
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        .scanner-allow-btn {
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 14px 20px;
          font-family: ${typography.fontFamily.sans};
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s ease;
          min-height: 48px;
          width: 100%;
        }
        .scanner-allow-btn.active {
          background: #16A34A;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
        }
        .scanner-allow-btn.disabled {
          background: #8FA3B8;
          cursor: not-allowed;
        }

        .scanner-reject-btn {
          background: #FFFFFF;
          color: #DC2626;
          border: 1.5px solid #DC2626;
          border-radius: 8px;
          padding: 10px 16px;
          font-family: ${typography.fontFamily.sans};
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
          min-height: 42px;
          width: 100%;
        }

        .scanner-empty-state {
          border: 1.5px dashed ${colors.header.border};
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
        }

        .scanner-empty-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: #F0F4F8;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.brand.accent};
        }

        .scanner-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .scanner-modal-box {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 20px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          box-sizing: border-box;
        }

        .reject-reason-btn {
          text-align: left;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid ${colors.header.border};
          background: #F8FAFC;
          font-size: 13px;
          font-weight: 600;
          color: ${colors.text.primary};
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .reject-reason-btn:hover {
          background: #FEF2F2 !important;
          border-color: #DC2626 !important;
          color: #DC2626 !important;
        }

        .scanner-modal-cancel-btn {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          background: #E2E8F0;
          color: ${colors.text.primary};
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .scanner-next-float-container {
          position: fixed;
          bottom: 24px;
          right: 28px;
          z-index: 900;
          display: flex;
          align-items: center;
        }

        .next-scan-btn {
          background: linear-gradient(135deg, ${colors.brand.primary} 0%, #E5AF36 100%);
          color: ${colors.sidebar.bg};
          border: none;
          border-radius: 50px;
          padding: 12px 24px;
          font-family: ${typography.fontFamily.sans};
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(244, 188, 67, 0.45), 0 2px 6px rgba(0,0,0,0.1);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .next-scan-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 30px rgba(244, 188, 67, 0.6);
        }
        .next-scan-btn:active {
          transform: translateY(1px) scale(0.98);
        }

        .scanner-space-badge {
          background: rgba(1, 27, 47, 0.15);
          color: ${colors.sidebar.bg};
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          margin-left: 2px;
        }

        @keyframes laserScan {
          0% { top: 8px; opacity: 0.8; }
          50% { top: calc(100% - 12px); opacity: 1; }
          100% { top: 8px; opacity: 0.8; }
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

        /* ── Tablet & Mobile Responsive Rules (Show camera flip & mobile controls only on mobile/tablet) ── */
        @media (max-width: 1024px) {
          .scanner-flip-btn {
            display: flex;
          }
          .scanner-torch-btn {
            display: flex;
          }
          .scanner-cam-mode-tag {
            display: inline-flex;
          }
          .scanner-viewfinder-top-badge {
            display: flex;
          }
          .scanner-floating-overlay-controls {
            display: flex;
          }
        }

        @media (max-width: 900px) {
          .scanner-main-grid {
            grid-template-columns: 1fr;
          }
          .scanner-details-grid {
            grid-template-columns: 1fr;
            padding: 16px;
            gap: 16px;
          }
        }

        @media (max-width: 640px) {
          .scanner-page-container {
            padding: 2px 0 80px 0;
            gap: 14px;
          }
          .scanner-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .scanner-page-title {
            font-size: 18px;
          }
          .scanner-today-pill {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
          .scanner-left-box {
            padding: 16px 12px;
          }
          .scanner-viewfinder-toolbar {
            flex-wrap: wrap;
            gap: 8px;
          }
          
          /* BIG EXPANDED VIEWPORT ON MOBILE SCREEN */
          .scanner-video-wrapper {
            height: 340px;
            max-width: 100%;
          }
          .scanner-floating-overlay-controls {
            bottom: 12px;
            right: 12px;
            gap: 8px;
          }
          .scanner-floating-action-btn {
            padding: 8px 12px;
            min-height: 40px;
            font-size: 12px;
          }
          .scanner-laser-box {
            width: 230px;
            height: 230px;
          }
          .scanner-placeholder-box {
            height: 280px;
            max-width: 100%;
          }
          
          .scanner-right-box {
            padding: 18px 14px;
          }
          .scanner-manual-form {
            flex-direction: column;
          }
          .scanner-submit-btn {
            width: 100%;
          }
          .scanner-result-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 14px 16px;
            gap: 10px;
          }
          .scanner-result-header-left {
            width: 100%;
          }
          .scanner-code-badge {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            text-align: left;
          }
          .scanner-date-bar {
            padding: 12px 16px;
          }
          .scanner-sub-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .scanner-next-float-container {
            bottom: 12px;
            right: 12px;
            left: 12px;
            justify-content: center;
          }
          .next-scan-btn {
            width: 100%;
            justify-content: center;
            padding: 13px 18px;
            font-size: 14px;
            box-sizing: border-box;
          }
          .scanner-space-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
