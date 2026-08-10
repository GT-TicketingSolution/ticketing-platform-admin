"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { typography } from "@/lib/theme";
import { Attraction } from "@/types/admin";

interface DeleteAttractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attraction: Attraction | null;
  onConfirmDelete: (id: string) => void;
}

export default function DeleteAttractionModal({
  isOpen,
  onClose,
  attraction,
  onConfirmDelete,
}: DeleteAttractionModalProps) {
  if (!isOpen || !attraction) return null;

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
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(179, 175, 175, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
              Delete Attraction
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#1E293B", fontFamily: typography.fontFamily.sans, lineHeight: "22px" }}>
            Are you sure you want to delete <strong>{attraction.name}</strong>? This action cannot be undone.
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                background: "#FFFFFF",
                color: "#011B2F",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirmDelete(attraction.id);
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
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
              }}
            >
              Delete Attraction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
