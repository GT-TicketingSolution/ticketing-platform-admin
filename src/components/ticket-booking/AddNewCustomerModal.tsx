"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

export interface NewCustomer {
  name: string;
  mobile: string;
  address?: string;
  gstn?: string;
}

interface AddNewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: NewCustomer) => void;
  isSaving?: boolean;
}

interface FieldErrors {
  name?: string;
  mobile?: string;
  address?: string;
  gstn?: string;
}

function validateGSTN(gstn: string): boolean {
  // 15-char GSTN: 2-digit state, 10-char PAN, entity num, Z, check char
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstn.toUpperCase());
}

export default function AddNewCustomerModal({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: AddNewCustomerModalProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [gstn, setGstn] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Customer name is required.";
    else if (name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!mobile.trim()) errs.mobile = "Mobile number is required.";
    else if (!/^\d{10}$/.test(mobile.trim()))
      errs.mobile = "Enter a valid 10-digit mobile number.";
    if (gstn.trim() && !validateGSTN(gstn.trim())) {
      errs.gstn = "Enter a valid 15-character GSTN (e.g. 27AAPFU0939F1ZV).";
    }
    return errs;
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  function handleSave() {
    setTouched({ name: true, mobile: true, address: true, gstn: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave({
      name: name.trim(),
      mobile: mobile.trim(),
      address: address.trim() || undefined,
      gstn: gstn.trim() ? gstn.trim().toUpperCase() : undefined,
    });
    setName("");
    setMobile("");
    setAddress("");
    setGstn("");
    setErrors({});
    setTouched({});
  }

  function handleClose() {
    setName("");
    setMobile("");
    setAddress("");
    setGstn("");
    setErrors({});
    setTouched({});
    onClose();
  }

  const inp = (hasError: boolean): React.CSSProperties => ({
    boxSizing: "border-box",
    width: "100%",
    height: "38px",
    background: "#FFFFFF",
    border: hasError ? "1.5px solid #EF4444" : "1.5px solid rgba(179,175,175,0.51)",
    borderRadius: "8px",
    padding: "0 14px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 500,
    fontSize: "12px",
    color: "#011B2F",
    outline: "none",
    transition: "border-color 0.2s",
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Modal card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "min(487px, 95vw)",
            background: "#FFFFFF",
            borderRadius: "6px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              background: "#011B2F",
              padding: "20px 30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "20px", color: "#FFFFFF", lineHeight: "25px" }}>
              Add New Customer
            </span>
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
              }}
            >
              <X size={22} color="#FFFFFF" strokeWidth={2} />
            </button>
          </div>

          {/* ── Body ── */}
          <div
            style={{
              padding: "28px 30px 30px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Customer Name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#011B2F",
                  marginBottom: "8px",
                }}
              >
                Customer Name
                <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Customer Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) setErrors(validate());
                }}
                onBlur={() => handleBlur("name")}
                style={inp(!!(touched.name && errors.name))}
              />
              {touched.name && errors.name && (
                <p style={{ margin: "4px 0 0 2px", fontSize: "11px", color: "#EF4444", fontWeight: 500 }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#011B2F",
                  marginBottom: "8px",
                }}
              >
                Mobile Number
                <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="tel"
                placeholder="Enter Mobile Number"
                value={mobile}
                maxLength={10}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setMobile(v);
                  if (touched.mobile) setErrors(validate());
                }}
                onBlur={() => handleBlur("mobile")}
                style={inp(!!(touched.mobile && errors.mobile))}
              />
              {touched.mobile && errors.mobile && (
                <p style={{ margin: "4px 0 0 2px", fontSize: "11px", color: "#EF4444", fontWeight: 500 }}>
                  {errors.mobile}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#011B2F",
                  marginBottom: "8px",
                }}
              >
                Address
                <span style={{ color: "#64748B", fontWeight: 400, fontSize: "12px", marginLeft: "4px" }}>(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Enter Address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (touched.address) setErrors(validate());
                }}
                onBlur={() => handleBlur("address")}
                style={inp(!!(touched.address && errors.address))}
              />
              {touched.address && errors.address && (
                <p style={{ margin: "4px 0 0 2px", fontSize: "11px", color: "#EF4444", fontWeight: 500 }}>
                  {errors.address}
                </p>
              )}
            </div>

            {/* GSTN */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#011B2F",
                  marginBottom: "8px",
                }}
              >
                GSTN
                <span style={{ color: "#64748B", fontWeight: 400, fontSize: "12px", marginLeft: "4px" }}>(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Enter GSTN (Optional)"
                value={gstn}
                maxLength={15}
                onChange={(e) => {
                  setGstn(e.target.value.toUpperCase());
                  if (touched.gstn) setErrors(validate());
                }}
                onBlur={() => handleBlur("gstn")}
                style={inp(!!(touched.gstn && errors.gstn))}
              />
              {touched.gstn && errors.gstn && (
                <p style={{ margin: "4px 0 0 2px", fontSize: "11px", color: "#EF4444", fontWeight: 500 }}>
                  {errors.gstn}
                </p>
              )}
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="anc-save-btn"
                style={{
                  width: "125px",
                  height: "36px",
                  background: isSaving ? "#E2E8F0" : "#F4BC43",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: isSaving ? "#94A3B8" : "#011B2F",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  transition: "background 0.18s ease, transform 0.15s ease",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .anc-save-btn:hover { background: #e5af36 !important; transform: translateY(-1px); }
      `}</style>
    </>
  );
}
