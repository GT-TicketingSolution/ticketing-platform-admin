"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Reference } from "@/types/complimentaryPass";
import { validateReference } from "@/app/(dashboard)/complimentary-passes/schema";

interface AddReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  refToEdit: Reference | null;
  onSave: (data: Omit<Reference, "id">) => void;
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
}: AddReferenceModalProps) {
  const [referenceName, setReferenceName] = useState("");
  const [department, setDepartment] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [post, setPost] = useState("");
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (refToEdit) {
      setReferenceName(refToEdit.referenceName);
      setDepartment(refToEdit.department);
      setContactPerson(refToEdit.contactPerson);
      setPost(refToEdit.post);
      setMobile(refToEdit.mobile);
      setStatus(refToEdit.status);
    } else {
      setReferenceName("");
      setDepartment("");
      setContactPerson("");
      setPost("");
      setMobile("");
      setStatus("Active");
    }
    setErrors({});
  }, [refToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateReference({
      referenceName: referenceName.trim(),
      department: department.trim(),
      contactPerson: contactPerson.trim(),
      post: post.trim(),
      mobile: mobile.trim(),
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
      referenceName: referenceName.trim(),
      department: department.trim(),
      contactPerson: contactPerson.trim(),
      post: post.trim() || "—",
      mobile: fmt,
      status,
    });
    onClose();
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
          borderRadius: "6px",
          width: "100%",
          maxWidth: "579px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
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
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "28px 30px 24px 30px" }}>
          {/* Reference Name */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              Reference Name <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter reference Name"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
              style={inputStyle}
            />
            {errors.referenceName && (
              <p style={errorStyle}>{errors.referenceName}</p>
            )}
          </div>

          {/* Department + Contact Person */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Department/Organization <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={inputStyle}
              />
              {errors.department && <p style={errorStyle}>{errors.department}</p>}
            </div>
            <div>
              <label style={labelStyle}>
                Contact Person <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter contact person name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                style={inputStyle}
              />
              {errors.contactPerson && (
                <p style={errorStyle}>{errors.contactPerson}</p>
              )}
            </div>
          </div>

          {/* Post + Mobile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div>
              <label style={labelStyle}>Post/Designation</label>
              <input
                type="text"
                placeholder="Enter Post or designation"
                value={post}
                onChange={(e) => setPost(e.target.value)}
                style={inputStyle}
              />
            </div>
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
                padding: "0 40px",
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
