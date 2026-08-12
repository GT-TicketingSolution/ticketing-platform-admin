"use client";

import React, { useState } from "react";
import { X, UploadCloud, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { typography } from "@/lib/theme";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newAttractionsCount: number) => void;
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: BulkUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onUploadSuccess(3);
      onClose();
    }, 1500);
  };

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
          maxWidth: "500px",
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
            padding: "20px 24px",
            background: "#0C2A42",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <UploadCloud size={22} color="#F4BC43" />
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
              Bulk Upload Attractions
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
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748B", fontFamily: typography.fontFamily.sans }}>
            Upload a CSV or Excel file containing attraction titles, categories, timings, and ticket pricing structures.
          </p>

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? "#2372A5" : "rgba(179, 175, 175, 0.6)"}`,
              borderRadius: "14px",
              padding: "32px 20px",
              textAlign: "center",
              background: dragActive ? "#F0F9FF" : "#F8FAFC",
              transition: "all 0.2s ease",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
              }}
            />
            {selectedFile ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <FileSpreadsheet size={40} color="#2372A5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F", fontFamily: typography.fontFamily.sans }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: "12px", color: "#64748B", fontFamily: typography.fontFamily.sans }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <UploadCloud size={38} color="#0C2A42" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F", fontFamily: typography.fontFamily.sans }}>
                  Drag & Drop CSV/Excel file here
                </span>
                <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: typography.fontFamily.sans }}>
                  or click to browse from computer
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
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
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: !selectedFile || isUploading ? "#94A3B8" : "#0C2A42",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(12, 42, 66, 0.25)",
              }}
            >
              {isUploading ? "Uploading..." : "Process Bulk Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
