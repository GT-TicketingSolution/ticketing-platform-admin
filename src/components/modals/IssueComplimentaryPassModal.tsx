"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ComplimentaryPass, Reference, ATTRACTIONS } from "@/types/complimentaryPass";
import { validatePass } from "@/app/(dashboard)/complimentary-passes/schema";

interface IssueComplimentaryPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  passToEdit: ComplimentaryPass | null;
  references: Reference[];
  onSave: (data: Omit<ComplimentaryPass, "id" | "passId">) => void;
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
}: IssueComplimentaryPassModalProps) {
  const [visitorName, setVisitorName] = useState("");
  const [mobile, setMobile] = useState("");
  const [attraction, setAttraction] = useState("");
  const [visitors, setVisitors] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Used" | "Expired">("Active");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

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
            <div>
              <label style={labelStyle}>
                Reference <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                list="icp-ref-list"
                style={inputStyle}
              />
              <datalist id="icp-ref-list">
                {uniqueRefs.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
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
              style={{
                height: "36px",
                padding: "0 30px",
                background: "#F4BC43",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(244,188,67,0.3)",
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
