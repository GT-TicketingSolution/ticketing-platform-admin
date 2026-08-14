"use client";

import React, { useState, useEffect } from "react";
import { X, Maximize2, Star, Play, Pause, Volume2, VolumeX, RefreshCw } from "lucide-react";

interface CameraFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraName: string;
  locationName: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  videoBgUrl?: string;
}

export default function CameraFeedModal({
  isOpen,
  onClose,
  cameraName,
  locationName,
  isFavorite,
  onToggleFavorite,
  videoBgUrl,
}: CameraFeedModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(12, 42, 66, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          maxWidth: "960px",
          background: "#0C2A42",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#FFFFFF",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            background: "#011B2F",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#DC2626",
                boxShadow: "0 0 10px rgba(220, 38, 38, 0.8)",
              }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {cameraName} — Live Feed
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>
                {locationName} · 1080p HD Stream (30 FPS)
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={onToggleFavorite}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isFavorite ? "#F4BC43" : "#94A3B8",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Star size={20} fill={isFavorite ? "#F4BC43" : "none"} />
            </button>

            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Stream Screen Box */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "500px",
            background: videoBgUrl
              ? `url(${videoBgUrl}) center/cover no-repeat`
              : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Top Info Overlays */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              padding: "6px 12px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                background: "#DC2626",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "3px",
              }}
            >
              LIVE
            </span>
            <span>REC CAM-01</span>
          </div>

          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              padding: "6px 12px",
              borderRadius: "6px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              color: "#FFFFFF",
            }}
          >
            {currentTime}
          </div>

          {/* Controls Bar at bottom of video stream */}
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              right: "16px",
              background: "rgba(1, 27, 47, 0.75)",
              backdropFilter: "blur(8px)",
              borderRadius: "10px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#FFFFFF",
                  display: "flex",
                }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={() => setIsMuted((m) => !m)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#FFFFFF",
                  display: "flex",
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <span style={{ fontSize: "12px", color: "#CBD5E1", fontFamily: "'Inter', sans-serif" }}>
                Signal: 100% (Bitrate: 4.2 Mbps)
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Exit Full Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
