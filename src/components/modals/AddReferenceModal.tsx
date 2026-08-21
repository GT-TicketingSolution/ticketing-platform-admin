"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { Reference, ReferencePayload } from "@/app/(dashboard)/complimentary-passes/types";
import { validateReference } from "@/app/(dashboard)/complimentary-passes/schema";

interface AddReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  refToEdit: Reference | null;
  onSave: (data: ReferencePayload) => Promise<void> | void;
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

export default function AddReferenceModal({
  isOpen,
  onClose,
  refToEdit,
  onSave,
  isSaving = false,
}: AddReferenceModalProps) {
  const [referenceName, setReferenceName] = useState("");
  const [department, setDepartment] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [post, setPost] = useState("");
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (refToEdit) {
      setReferenceName(refToEdit.referenceName || "");
      setDepartment(refToEdit.department || "");
      setContactPerson(refToEdit.contactPerson || "");
      setPost(refToEdit.post || "");
      setMobile(refToEdit.mobile ? refToEdit.mobile.replace(/\D/g, "") : "");
      const st = (refToEdit.status || "ACTIVE").toUpperCase();
      setStatus(st === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    } else {
      setReferenceName("");
      setDepartment("");
      setContactPerson("");
      setPost("");
      setMobile("");
      setStatus("ACTIVE");
    }
    setErrors({});
  }, [refToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobile.replace(/\D/g, "");

    const validation = validateReference({
      referenceName: referenceName.trim(),
      department: department.trim(),
      contactPerson: contactPerson.trim(),
      post: post.trim(),
      mobile: cleanMobile,
      status,
    });

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    await onSave({
      referenceName: referenceName.trim(),
      department: department.trim(),
      contactPerson: contactPerson.trim(),
      post: post.trim() || undefined,
      mobile: cleanMobile,
      status,
    });
  };

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
          maxWidth: "600px",
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
            {refToEdit ? "Edit Reference" : "Add Reference"}
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
          {/* Reference Name */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              Reference Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ABC Corporation / MLA Office"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
              style={inputStyle}
            />
            {errors.referenceName && <p style={errorStyle}>{errors.referenceName}</p>}
          </div>

          {/* Department / Org */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              Department / Organization <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. HR / Government / Administration"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={inputStyle}
            />
            {errors.department && <p style={errorStyle}>{errors.department}</p>}
          </div>

          {/* Contact Person + Post */}
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
                Contact Person <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                style={inputStyle}
              />
              {errors.contactPerson && (
                <p style={errorStyle}>{errors.contactPerson}</p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Post / Designation</label>
              <input
                type="text"
                placeholder="e.g. Manager / Director"
                value={post}
                onChange={(e) => setPost(e.target.value)}
                style={inputStyle}
              />
              {errors.post && <p style={errorStyle}>{errors.post}</p>}
            </div>
          </div>

          {/* Mobile + Status */}
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
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                }
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
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
                <span>{refToEdit ? "Update Reference" : "Add Reference"}</span>
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
