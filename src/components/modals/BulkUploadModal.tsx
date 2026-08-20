"use client";

import React, { useState } from "react";
import { X, Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useBulkUploadAttractions } from "@/hooks/useAttractionManagementQueries";
import { useToast } from "@/components/ui/Toast";
import type { BulkAttractionPayload } from "@/app/(dashboard)/attraction-management/types";

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

function parseCsvToBulkPayload(csvText: string): BulkAttractionPayload {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header row and at least one data row.");
  }

  // Normalize header keys: lowercase and alphanumeric only
  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const items: BulkAttractionPayload = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].trim() : "";
    });

    const attractionId =
      rowObj["attractionid"] ||
      rowObj["attraction"] ||
      rowObj["id"] ||
      "";

    if (!attractionId) {
      continue;
    }

    const parseBool = (val?: string) => {
      if (!val) return false;
      const lower = val.toLowerCase().trim();
      return lower === "true" || lower === "yes" || lower === "1";
    };

    const parseNum = (val?: string) => {
      if (!val) return 0;
      const cleaned = val.replace(/[^0-9.-]+/g, "");
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    };

    items.push({
      attractionId,
      image: rowObj["image"] || rowObj["imageurl"] || null,
      description: rowObj["description"] || rowObj["desc"] || null,
      timing: rowObj["timing"] || rowObj["timings"] || rowObj["time"] || null,
      adultPrice: parseNum(rowObj["adultprice"] || rowObj["adult"]),
      childPrice: parseNum(rowObj["childprice"] || rowObj["child"]),
      studentPrice: parseNum(rowObj["studentprice"] || rowObj["student"]),
      seniorPrice: parseNum(rowObj["seniorprice"] || rowObj["senior"]),
      foreignerPrice: parseNum(rowObj["foreignerprice"] || rowObj["foreigner"]),
      hasSeating: parseBool(rowObj["hasseating"] || rowObj["seating"]),
    });
  }

  if (items.length === 0) {
    throw new Error("No valid attraction records with an 'attractionId' were found in the CSV.");
  }

  return items;
}

async function parseFileToPayload(file: File): Promise<BulkAttractionPayload> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON file must contain an array of attraction objects.");
    }
    return parsed.map((item: any, idx: number) => {
      if (!item.attractionId) {
        throw new Error(`Item ${idx + 1} is missing required 'attractionId'.`);
      }
      return {
        attractionId: String(item.attractionId).trim(),
        image: item.image ?? null,
        description: item.description ?? null,
        timing: item.timing ?? null,
        adultPrice: typeof item.adultPrice === "number" ? item.adultPrice : (Number(item.adultPrice) || 0),
        childPrice: typeof item.childPrice === "number" ? item.childPrice : (Number(item.childPrice) || 0),
        studentPrice: typeof item.studentPrice === "number" ? item.studentPrice : (Number(item.studentPrice) || 0),
        seniorPrice: typeof item.seniorPrice === "number" ? item.seniorPrice : (Number(item.seniorPrice) || 0),
        foreignerPrice: typeof item.foreignerPrice === "number" ? item.foreignerPrice : (Number(item.foreignerPrice) || 0),
        hasSeating: typeof item.hasSeating === "boolean" ? item.hasSeating : Boolean(item.hasSeating),
      };
    });
  }
  return parseCsvToBulkPayload(text);
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: BulkUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const bulkUploadMutation = useBulkUploadAttractions();
  const { showToast } = useToast();
  const isUploading = bulkUploadMutation.isPending;

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

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast("Please select a file to upload.", "error");
      return;
    }

    try {
      const payload = await parseFileToPayload(selectedFile);
      if (!payload || payload.length === 0) {
        showToast("No valid attraction records found in the file.", "error");
        return;
      }

      const result = await bulkUploadMutation.mutateAsync(payload);
      const count = Array.isArray(result?.data) ? result.data.length : payload.length;
      onUploadSuccess(count);
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to process file for upload.";
      showToast(errorMsg, "error");
    }
  };

  const handleDownloadTemplate = () => {
    // Generate sample CSV for download with exact payload fields
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "attractionId,image,description,timing,adultPrice,childPrice,studentPrice,seniorPrice,foreignerPrice,hasSeating\n" +
      "toy-train-id,https://example.com/toy-train.jpg,Toy train ride,09:00 AM - 06:00 PM,100,50,70,60,200,true\n" +
      "rope-way-id,https://example.com/rope-way.jpg,Rope way ride,10:00 AM - 05:00 PM,200,100,150,120,400,true\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Attraction_Upload_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* Container Header */}
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
              Upload a file to add or update multiple attractions at once.
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

        {/* Modal Outer Card Container matching Screenshot 4 */}
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

              {/* Dropzone matching Screenshot 4 */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  minHeight: "180px",
                  background: dragActive ? "#F0F9FF" : "#F8FAFC",
                  border: `1.5px ${dragActive ? "dashed" : "solid"} ${dragActive ? "#2372A5" : "rgba(179, 175, 175, 0.51)"
                    }`,
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  position: "relative",
                  textAlign: "center",
                }}
              >
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls, .json"
                  onChange={handleFileChange}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />

                {selectedFile ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FileSpreadsheet size={40} color="#2372A5" />
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
                      {(selectedFile.size / 1024).toFixed(1)} KB - Click or drag to change
                    </span>
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
                      Drag & Drop your File here
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
                    <label
                      htmlFor="bulk-file-upload"
                      style={{
                        boxSizing: "border-box",
                        padding: "8px 20px",
                        background: "#F4BC43",
                        borderRadius: "8px",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#011B2F",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Upload size={14} color="#011B2F" />
                      Browse File
                    </label>
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "11px",
                        color: "#6B7280",
                        marginTop: "12px",
                      }}
                    >
                      Only .csv, .xls, .xlsx files are allowed
                    </span>
                  </>
                )}
              </div>
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
                    Download our sample template to see the correct format and
                    required columns
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

              {/* Right Column: Template Guidelines */}
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
                    paddingLeft: "18px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    lineHeight: "20px",
                    color: "#6B7280",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <li>Only CSV, XLS, XLSX Files are supported.</li>
                  <li>Maximum 500 records can be uploaded at a time.</li>
                  <li>First row must contain column headers.</li>
                  <li>
                    Existing attractions will be updated if the attraction name
                    matches.
                  </li>
                  <li>Ensure all required fields are filled in the file.</li>
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
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                style={{
                  boxSizing: "border-box",
                  width: "153px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: "44px",
                  background: isUploading ? "#E5E7EB" : "#F4BC43",
                  borderRadius: "8px",
                  border: "none",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: isUploading ? "#6B7280" : "#011B2F",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  boxShadow: isUploading ? "none" : "0 4px 12px rgba(244, 188, 67, 0.3)",
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload File</span>
                )}
              </button>
            </div>
          </div>
        </div>
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
