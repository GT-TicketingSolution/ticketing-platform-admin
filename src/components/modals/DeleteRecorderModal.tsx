"use client";

import React from "react";
import { AlertTriangle, X, Trash2 } from "lucide-react";
import { typography } from "@/lib/theme";

interface DeleteRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recorderName: string;
  onConfirmDelete: () => void;
}

export default function DeleteRecorderModal({
  isOpen,
  onClose,
  recorderName,
  onConfirmDelete,
}: DeleteRecorderModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(12, 42, 66, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(179, 175, 175, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "#DC2626",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={22} color="#FFFFFF" />
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                color: "#FFFFFF",
              }}
            >
              Disconnect CCTV Recorder
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#FEF2F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trash2 size={20} color="#DC2626" />
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#011B2F",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Delete & Disconnect <strong>{recorderName || "CCTV Recorder"}</strong>?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#64748B",
                  fontFamily: typography.fontFamily.sans,
                  lineHeight: "20px",
                }}
              >
                This action will disconnect all live camera feeds from this NVR recorder and remove its configuration.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                background: "#FFFFFF",
                color: "#011B2F",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmDelete();
                onClose();
              }}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#DC2626",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
              }}
            >
              Delete Recorder
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
