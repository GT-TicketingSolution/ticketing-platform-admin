"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Loader2 } from "lucide-react";
import { ComplimentaryPass, Reference, ATTRACTIONS } from "@/types/complimentaryPass";
import { validatePass } from "@/app/(dashboard)/complimentary-passes/schema";

interface IssueComplimentaryPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  passToEdit: ComplimentaryPass | null;
  references: Reference[];
  onSave: (data: Omit<ComplimentaryPass, "id" | "passId">) => void;
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
  onSave,
  isSaving = false,
}: IssueComplimentaryPassModalProps) {
  const [visitorName, setVisitorName] = useState("");
  const [mobile, setMobile] = useState("");
  const [attraction, setAttraction] = useState("");
  const [visitors, setVisitors] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Used" | "Expired">("Active");
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
      setVisitorName(passToEdit.visitorName);
      setMobile(passToEdit.mobile);
      setAttraction(passToEdit.attraction);
      setVisitors(passToEdit.visitors);
      setReference(passToEdit.reference);
      setDate(passToEdit.date);
      setStatus(passToEdit.status);
    } else {
      setVisitorName("");
      setMobile("");
      setAttraction("");
      setVisitors("");
      setReference("");
      setDate("");
      setStatus("Active");
    }
    setErrors({});
  }, [passToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePass({
      visitorName: visitorName.trim(),
      mobile: mobile.trim(),
      attraction,
      visitors: visitors === "" ? (undefined as unknown as number) : Number(visitors),
      reference: reference.trim(),
      fromDate: date,
      status,
    });

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    let fmt = mobile.trim();
    if (!fmt.startsWith("+91")) {
      const digits = fmt.replace(/\D/g, "");
      if (digits.length === 10) fmt = `+91 ${digits}`;
    }

    onSave({
      visitorName: visitorName.trim(),
      mobile: fmt,
      attraction,
      visitors: Number(visitors),
      reference: reference.trim(),
      date,
      status,
    });
    onClose();
  };

  const uniqueRefs = [...new Set(references.map((r) => r.referenceName))];

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
          borderRadius: "6px",
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
              fontSize: "20px",
              lineHeight: "25px",
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
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "28px 30px 24px 30px" }}>
          {/* Visitor Name */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              Visitor Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter visitor name"
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
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Mobile Number <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={inputStyle}
              />
              {errors.mobile && <p style={errorStyle}>{errors.mobile}</p>}
            </div>
            <div>
              <label style={labelStyle}>
                Attraction <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <select
                value={attraction}
                onChange={(e) => setAttraction(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Select attraction</option>
                {ATTRACTIONS.filter((a) => a !== "All Attractions").map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {errors.attraction && <p style={errorStyle}>{errors.attraction}</p>}
            </div>
          </div>

          {/* Visitors + Reference */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                No. of Visitors <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="Enter count"
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
                  placeholder="Select or enter reference"
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value);
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

              {/* Dropdown list of already created references */}
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
                    maxHeight: "180px",
                    overflowY: "auto",
                  }}
                >
                  {references.length === 0 ? (
                    <div style={{ padding: "10px 12px", fontSize: "12px", color: "#6B7280" }}>
                      No references found. Type to enter a custom reference.
                    </div>
                  ) : (
                    references
                      .filter((r) =>
                        r.referenceName.toLowerCase().includes(reference.toLowerCase()) ||
                        r.contactPerson.toLowerCase().includes(reference.toLowerCase()) ||
                        r.department.toLowerCase().includes(reference.toLowerCase())
                      )
                      .map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setReference(r.referenceName);
                            if (!visitorName.trim()) {
                              setVisitorName(r.contactPerson);
                            }
                            if (!mobile.trim()) {
                              setMobile(r.mobile);
                            }
                            // Clear error states for auto-filled fields if any
                            setErrors((prev) => ({
                              ...prev,
                              reference: "",
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
                            {r.contactPerson} {r.post && r.post !== "—" ? `(${r.post})` : ""} &bull; {r.department}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {errors.reference && <p style={errorStyle}>{errors.reference}</p>}
            </div>
          </div>

          {/* Date + Status */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "28px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Date <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
              {errors.fromDate && <p style={errorStyle}>{errors.fromDate}</p>}
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "Active" | "Used" | "Expired")
                }
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="Active">Active</option>
                <option value="Used">Used</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "36px",
                padding: "0 20px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "14px",
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
                height: "36px",
                padding: "0 30px",
                background: isSaving ? "#E5E7EB" : "#F4BC43",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
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
                <span>Add</span>
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
