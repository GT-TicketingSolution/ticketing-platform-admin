"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, FileX } from "lucide-react";
import { useBulkUploadAttractions } from "@/hooks/useAttractionManagementQueries";
import { useToast } from "@/components/ui/Toast";
import type { BulkAttractionPayload } from "@/app/(dashboard)/attraction-management/types";
import {
  bulkUploadFormSchema,
  validateBulkUploadRows,
  isAllowedBulkFile,
  type BulkUploadFormData,
} from "@/app/(dashboard)/attraction-management/bulkUploadSchema";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newAttractionsCount: number) => void;
}

// ── CSV Parser Helpers ────────────────────────────────────────────────────────
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCsvToRawRows(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error(
      "CSV file must contain a header row and at least one data row.\nFirst row must contain column headers."
    );
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  // Validate that headers are present (first row must have column headers)
  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new Error("First row must contain column headers.");
  }

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    rows.push(rowObj);
  }

  return rows;
}

async function parseFileToRawRows(file: File): Promise<Record<string, any>[]> {
  const text = await file.text();
  return parseCsvToRawRows(text);
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: BulkUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const bulkUploadMutation = useBulkUploadAttractions();
  const { showToast } = useToast();
  const isUploading = bulkUploadMutation.isPending;

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BulkUploadFormData>({
    resolver: zodResolver(bulkUploadFormSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const selectedFile = watch("file");

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setFileError(null);

    // Validate file type immediately for instant UI feedback
    if (!isAllowedBulkFile(file)) {
      setFileError("Only CSV, XLS, XLSX Files are supported.");
      setValue("file", file as any); // set so zodResolver also flags the error
      return;
    }

    setValue("file", file, { shouldValidate: true });
  };

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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue("file", undefined as any, { shouldValidate: false });
    setFileError(null);
    reset();
  };

  const onSubmit = async (data: BulkUploadFormData) => {
    let rawRows: Record<string, any>[];
    try {
      rawRows = await parseFileToRawRows(data.file);
    } catch (err: any) {
      showToast(err?.message || "Failed to read file.", "error");
      return;
    }

    let payload: BulkAttractionPayload;
    try {
      payload = validateBulkUploadRows(rawRows);
    } catch (err: any) {
      showToast(err?.message || "Failed to validate file data.", "error");
      return;
    }

    if (!payload || payload.length === 0) {
      showToast("No valid attraction records found in the file. Ensure all required fields are filled in the file.", "error");
      return;
    }

    try {
      const result = await bulkUploadMutation.mutateAsync(payload);
      const count = Array.isArray(result?.data) ? result.data.length : payload.length;
      onUploadSuccess(count);
      reset();
      setValue("file", undefined as any);
      setFileError(null);
      onClose();
    } catch {
      // Backend error is handled and toasted centrally by the axios response interceptor.
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "name,type,image,description,timing,adultPrice,childPrice,studentPrice,seniorPrice,foreignerPrice,hasSeating\n" +
      "Roller Coaster,RIDE,https://example.com/roller-coaster.jpg,High-speed roller coaster attraction,10:00 AM - 6:00 PM,500,300,350,250,800,true\n" +
      "Water Ride,RIDE,,Exciting water ride,11:00 AM - 7:00 PM,400,250,300,200,700,false\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Attraction_Upload_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Merge zod error and immediate fileError
  const fileValidationError = fileError || errors.file?.message;
  const hasFileError = Boolean(fileValidationError);
  const hasValidFile = selectedFile && !hasFileError;

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
          maxWidth: "880px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(179, 175, 175, 0.4)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "24px 32px 16px 32px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 6px 0",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "20px",
                lineHeight: "25px",
                color: "#0C2A42",
              }}
            >
              Bulk Upload
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              Upload a CSV, XLS, or XLSX file to add or update multiple attractions at once.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#6B7280",
              padding: "4px",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ padding: "0 32px 32px 32px" }}>
            <div
              style={{
                boxSizing: "border-box",
                width: "100%",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "15px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "28px",
              }}
            >
              {/* Section 1: Upload File */}
              <div>
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#0C2A42",
                  }}
                >
                  1. Upload File
                </h3>

                {/* Dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    minHeight: "180px",
                    background: hasFileError
                      ? "#FFF5F5"
                      : dragActive
                      ? "#F0F9FF"
                      : hasValidFile
                      ? "#F0FDF4"
                      : "#F8FAFC",
                    border: `1.5px ${dragActive ? "dashed" : "solid"} ${
                      hasFileError
                        ? "#F87171"
                        : dragActive
                        ? "#2372A5"
                        : hasValidFile
                        ? "#22C55E"
                        : "rgba(179, 175, 175, 0.51)"
                    }`,
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    position: "relative",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      cursor: "pointer",
                      zIndex: 1,
                    }}
                  />

                  {hasValidFile ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <CheckCircle2 size={40} color="#22C55E" />
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#011B2F",
                        }}
                      >
                        {selectedFile.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: "12px",
                          color: "#6B7280",
                        }}
                      >
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{
                          marginTop: "4px",
                          zIndex: 2,
                          position: "relative",
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          borderRadius: "6px",
                          padding: "4px 12px",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#DC2626",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <X size={12} /> Remove
                      </button>
                    </div>
                  ) : hasFileError && selectedFile ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <FileX size={40} color="#EF4444" />
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#DC2626",
                        }}
                      >
                        {selectedFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{
                          marginTop: "4px",
                          zIndex: 2,
                          position: "relative",
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          borderRadius: "6px",
                          padding: "4px 12px",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#DC2626",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <X size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} color="#2372A5" strokeWidth={1.8} />
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "#011B2F",
                          marginTop: "10px",
                        }}
                      >
                        Drag &amp; Drop your File here
                      </span>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 500,
                          fontSize: "11px",
                          color: "#6B7280",
                          margin: "4px 0 10px 0",
                        }}
                      >
                        or
                      </span>
                      <span
                        style={{
                          boxSizing: "border-box",
                          padding: "8px 20px",
                          background: "#F4BC43",
                          borderRadius: "8px",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "#011B2F",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          pointerEvents: "none",
                        }}
                      >
                        <Upload size={14} color="#011B2F" />
                        Browse File
                      </span>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 500,
                          fontSize: "11px",
                          color: "#6B7280",
                          marginTop: "12px",
                        }}
                      >
                        Only CSV, XLS, XLSX Files are supported
                      </span>
                    </>
                  )}
                </div>

                {/* File Validation Error Banner */}
                {hasFileError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      marginTop: "10px",
                      padding: "10px 14px",
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: "8px",
                    }}
                  >
                    <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: "1px" }} />
                    <div
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#DC2626",
                        lineHeight: "1.5",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {fileValidationError}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Download Template & Guidelines */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1px 1.4fr",
                  gap: "24px",
                  alignItems: "stretch",
                }}
                className="section-template-grid"
              >
                {/* Left Column: Download Template */}
                <div>
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "16px",
                      color: "#0C2A42",
                    }}
                  >
                    2. Download Template
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    {/* CSV Yellow Icon Badge */}
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        background: "#FEF3C7",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#D97706",
                        fontWeight: 800,
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      CSV
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "12px",
                        lineHeight: "16px",
                        color: "#6B7280",
                      }}
                    >
                      Download our sample template to see the correct format and required columns.{" "}
                      <strong style={{ color: "#374151" }}>Image and Description are optional.</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      boxSizing: "border-box",
                      padding: "8px 18px",
                      background: "#FFFFFF",
                      border: "1.5px solid rgba(179, 175, 175, 0.51)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "12px",
                      color: "#011B2F",
                      transition: "all 0.18s ease",
                    }}
                    className="btn-download-template"
                  >
                    <Download size={14} color="#011B2F" />
                    Download Template
                  </button>
                </div>

                {/* Vertical Line Divider */}
                <div style={{ background: "#E2E8F0", width: "100%", height: "100%" }} />

                {/* Right Column: Guidelines */}
                <div>
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "16px",
                      color: "#0C2A42",
                    }}
                  >
                    Guidelines
                  </h3>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "0",
                      listStyle: "none",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: "12px",
                      lineHeight: "18px",
                      color: "#6B7280",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {[
                      "Only CSV, XLS, XLSX Files are supported.",
                      "First row must contain column headers.",
                      "Ensure all required fields are filled in the file.",
                      "Image and Description fields are optional.",
                      "Maximum 500 records can be uploaded at a time.",
                      "Existing attractions will be updated if the name matches.",
                    ].map((rule, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            background: "#EFF6FF",
                            color: "#2563EB",
                            fontSize: "9px",
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Modal Bottom Action Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "14px",
                  marginTop: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    boxSizing: "border-box",
                    width: "124px",
                    height: "44px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#011B2F",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploading || !hasValidFile}
                  style={{
                    boxSizing: "border-box",
                    width: "153px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    height: "44px",
                    background: isUploading || !hasValidFile ? "#E5E7EB" : "#F4BC43",
                    borderRadius: "8px",
                    border: "none",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: isUploading || !hasValidFile ? "#6B7280" : "#011B2F",
                    cursor: isUploading || !hasValidFile ? "not-allowed" : "pointer",
                    boxShadow:
                      isUploading || !hasValidFile ? "none" : "0 4px 12px rgba(244, 188, 67, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload File</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        .btn-download-template:hover {
          background: #F8FAFC !important;
        }
        @media (max-width: 768px) {
          .section-template-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
