"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Loader2 } from "lucide-react";
import type { ComplimentaryPass, Reference, ComplimentaryPassPayload } from "@/app/(dashboard)/complimentary-passes/types";
import { validatePass } from "@/app/(dashboard)/complimentary-passes/schema";

interface IssueComplimentaryPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  passToEdit: ComplimentaryPass | null;
  references: Reference[];
  attractions: Array<{ id: string; name: string }>;
  onSave: (data: ComplimentaryPassPayload) => Promise<void> | void;
  isSaving?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "38px",
  background: "#FFFFFF",
  border: "1.5px solid rgba(179, 175, 175, 0.51)",
  borderRadius: "8px",
  padding: "0 12px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  fontSize: "12px",
  color: "#011B2F",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  fontSize: "14px",
  color: "#011B2F",
  marginBottom: "6px",
  display: "block",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 500,
  fontSize: "11px",
  color: "#DC2626",
  marginTop: "3px",
};

export default function IssueComplimentaryPassModal({
  isOpen,
  onClose,
  passToEdit,
  references,
  attractions,
  onSave,
  isSaving = false,
}: IssueComplimentaryPassModalProps) {
  const [visitorName, setVisitorName] = useState("");
  const [mobile, setMobile] = useState("");
  const [attractionId, setAttractionId] = useState("");
  const [visitors, setVisitors] = useState<number | "">(1);
  const [referenceId, setReferenceId] = useState("");
  const [referenceSearch, setReferenceSearch] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "USED" | "EXPIRED">("ACTIVE");
  const [isRefOpen, setIsRefOpen] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const refDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (refDropdownRef.current && !refDropdownRef.current.contains(event.target as Node)) {
        setIsRefOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (passToEdit) {
      setVisitorName(passToEdit.visitorName || "");
      setMobile(passToEdit.mobile ? passToEdit.mobile.replace(/\D/g, "") : "");
      setAttractionId(passToEdit.attractionId || "");
      setVisitors(passToEdit.visitors ?? 1);
      setReferenceId(passToEdit.referenceId || "");
      const foundRef = references.find((r) => r.id === passToEdit.referenceId);
      setReferenceSearch(foundRef ? foundRef.referenceName : (passToEdit.referenceName || ""));
      // Normalise date
      const d = passToEdit.visitDate || passToEdit.date || "";
      setVisitDate(d ? d.split("T")[0] : "");
      const st = (passToEdit.status || "ACTIVE").toUpperCase();
      setStatus(st === "USED" ? "USED" : st === "EXPIRED" ? "EXPIRED" : "ACTIVE");
    } else {
      setVisitorName("");
      setMobile("");
      setAttractionId(attractions.length > 0 ? attractions[0].id : "");
      setVisitors(1);
      setReferenceId("");
      setReferenceSearch("");
      setVisitDate(new Date().toISOString().split("T")[0]);
      setStatus("ACTIVE");
    }
    setErrors({});
  }, [passToEdit, isOpen, attractions, references]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobile.replace(/\D/g, "");

    const validation = validatePass({
      visitorName: visitorName.trim(),
      mobile: cleanMobile,
      attractionId,
      visitors: Number(visitors),
      referenceId,
      visitDate,
      status,
    });

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    await onSave({
      visitorName: visitorName.trim(),
      mobile: cleanMobile,
      attractionId,
      visitors: Number(visitors),
      referenceId,
      visitDate,
      status,
    });
  };

  const filteredReferences = references.filter((r) => {
    const q = referenceSearch.toLowerCase();
    return (
      r.referenceName.toLowerCase().includes(q) ||
      r.contactPerson.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(1, 27, 47, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "620px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#011B2F",
            padding: "20px 30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "18px",
              color: "#FFFFFF",
            }}
          >
            {passToEdit ? "Edit Complimentary Pass" : "Issue Complimentary Pass"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              display: "flex",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "28px 30px 24px 30px" }}>
          {/* Visitor Name */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              Visitor Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter visitor full name"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              style={inputStyle}
            />
            {errors.visitorName && <p style={errorStyle}>{errors.visitorName}</p>}
          </div>

          {/* Mobile + Attraction */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
              marginBottom: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Mobile Number (10 Digits) <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                style={inputStyle}
              />
              {errors.mobile && <p style={errorStyle}>{errors.mobile}</p>}
            </div>

            <div>
              <label style={labelStyle}>
                Attraction <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <select
                value={attractionId}
                onChange={(e) => setAttractionId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Select Attraction</option>
                {attractions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {errors.attractionId && <p style={errorStyle}>{errors.attractionId}</p>}
            </div>
          </div>

          {/* Visitors + Reference Dropdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
              marginBottom: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                No. of Visitors <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                placeholder="e.g. 2"
                value={visitors}
                onChange={(e) =>
                  setVisitors(e.target.value === "" ? "" : Number(e.target.value))
                }
                style={inputStyle}
              />
              {errors.visitors && <p style={errorStyle}>{errors.visitors}</p>}
            </div>

            <div ref={refDropdownRef} style={{ position: "relative" }}>
              <label style={labelStyle}>
                Reference <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Select reference..."
                  value={referenceSearch}
                  onChange={(e) => {
                    setReferenceSearch(e.target.value);
                    setReferenceId("");
                    setIsRefOpen(true);
                  }}
                  onFocus={() => setIsRefOpen(true)}
                  style={{ ...inputStyle, paddingRight: "32px" }}
                />
                <button
                  type="button"
                  onClick={() => setIsRefOpen((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#011B2F",
                  }}
                >
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isRefOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
              </div>

              {/* Reference Dropdown */}
              {isRefOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 999,
                    marginTop: "4px",
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {references.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "12px", color: "#6B7280" }}>
                      No references found. Please add a reference in Reference Management first.
                    </div>
                  ) : filteredReferences.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "12px", color: "#6B7280" }}>
                      No matching reference found.
                    </div>
                  ) : (
                    filteredReferences.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          setReferenceId(r.id);
                          setReferenceSearch(r.referenceName);
                          if (!visitorName.trim()) {
                            setVisitorName(r.contactPerson);
                          }
                          if (!mobile.trim()) {
                            setMobile(r.mobile.replace(/\D/g, ""));
                          }
                          setErrors((prev) => ({
                            ...prev,
                            referenceId: "",
                            visitorName: "",
                            mobile: "",
                          }));
                          setIsRefOpen(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #F3F4F6",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#F0F7FF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "12px", color: "#011B2F" }}>
                          {r.referenceName}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6B7280" }}>
                          {r.contactPerson} {r.post ? `(${r.post})` : ""} &bull; {r.department} &bull; {r.mobile}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {errors.referenceId && <p style={errorStyle}>{errors.referenceId}</p>}
            </div>
          </div>

          {/* Visit Date + Status */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Visit Date <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                style={inputStyle}
              />
              {errors.visitDate && <p style={errorStyle}>{errors.visitDate}</p>}
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "ACTIVE" | "USED" | "EXPIRED")
                }
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="USED">USED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "38px",
                padding: "0 20px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "13px",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                height: "38px",
                padding: "0 28px",
                background: isSaving ? "#E5E7EB" : "#F4BC43",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "13px",
                color: isSaving ? "#6B7280" : "#011B2F",
                cursor: isSaving ? "not-allowed" : "pointer",
                boxShadow: isSaving ? "none" : "0 4px 12px rgba(244,188,67,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{passToEdit ? "Update Pass" : "Issue Pass"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
