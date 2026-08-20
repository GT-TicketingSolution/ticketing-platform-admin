"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Check, Loader2 } from "lucide-react";
import { Customer } from "@/types/admin";
import { typography } from "@/lib/theme";
import { validateCustomer } from "@/app/(dashboard)/customer-management/schema";

interface AddEditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null; // Null means adding a new customer, non-null means editing
  onSave: (customerData: { name: string; mobile: string; gstn: string; id?: string }) => void;
  isSaving?: boolean;
}

export default function AddEditCustomerModal({
  isOpen,
  onClose,
  customer,
  onSave,
  isSaving = false,
}: AddEditCustomerModalProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstn, setGstn] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setMobile(customer.mobile || "");
      setGstn(customer.gstn || "");
    } else {
      setName("");
      setMobile("");
      setGstn("");
    }
    setErrors({});
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Schema-based validation using Zod schema from schema.ts
    const validation = validateCustomer({ name, mobile, gstn });
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    // Standardize phone format if entered without +91 prefix
    let formattedMobile = mobile.trim();
    if (!formattedMobile.startsWith("+91")) {
      const cleanDigits = formattedMobile.replace(/\D/g, "");
      if (cleanDigits.length === 10) {
        formattedMobile = `+91 ${cleanDigits}`;
      }
    }

    onSave({
      id: customer?.id,
      name: name.trim(),
      mobile: formattedMobile,
      gstn: gstn.trim().toUpperCase(),
    });

    onClose();
  };

  const isEdit = !!customer;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(1, 27, 47, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
        animation: "customerModalFadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "487px",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "customerModalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner matching exact Figma Rectangle 98 styling */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "71px",
            background: "#011B2F",
            borderRadius: "6px 6px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
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
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Modal"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "50%",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X size={24} color="#FFFFFF" />
          </button>
        </div>

        {/* Modal Form Body matching exact positions & styles */}
        <form onSubmit={handleSubmit} style={{ padding: "28px 30px 30px 30px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {/* Customer Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                htmlFor="customer-name-input"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  lineHeight: "18px",
                  color: "#011B2F",
                }}
              >
                Customer Name<span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                id="customer-name-input"
                type="text"
                placeholder="Enter Customer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  background: "#FFFFFF",
                  border: `1.5px solid ${errors.name ? "#DC2626" : "rgba(179, 175, 175, 0.51)"}`,
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#011B2F",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  if (!errors.name) e.target.style.borderColor = "#F4BC43";
                }}
                onBlur={(e) => {
                  if (!errors.name) e.target.style.borderColor = "rgba(179, 175, 175, 0.51)";
                }}
              />
              {errors.name && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#DC2626",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={13} />
                  {errors.name}
                </span>
              )}
            </div>

            {/* Mobile Number */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                htmlFor="customer-mobile-input"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  lineHeight: "18px",
                  color: "#011B2F",
                }}
              >
                Mobile Number<span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                id="customer-mobile-input"
                type="text"
                placeholder="Enter Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  background: "#FFFFFF",
                  border: `1.5px solid ${errors.mobile ? "#DC2626" : "rgba(179, 175, 175, 0.51)"}`,
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#011B2F",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  if (!errors.mobile) e.target.style.borderColor = "#F4BC43";
                }}
                onBlur={(e) => {
                  if (!errors.mobile) e.target.style.borderColor = "rgba(179, 175, 175, 0.51)";
                }}
              />
              {errors.mobile && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#DC2626",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={13} />
                  {errors.mobile}
                </span>
              )}
            </div>

            {/* GSTN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                htmlFor="customer-gstn-input"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  lineHeight: "18px",
                  color: "#011B2F",
                }}
              >
                GSTN<span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                id="customer-gstn-input"
                type="text"
                placeholder="Enter GSTN"
                value={gstn}
                onChange={(e) => setGstn(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  height: "38px",
                  background: "#FFFFFF",
                  border: `1.5px solid ${errors.gstn ? "#DC2626" : "rgba(179, 175, 175, 0.51)"}`,
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#011B2F",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  if (!errors.gstn) e.target.style.borderColor = "#F4BC43";
                }}
                onBlur={(e) => {
                  if (!errors.gstn) e.target.style.borderColor = "rgba(179, 175, 175, 0.51)";
                }}
              />
              {errors.gstn && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#DC2626",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={13} />
                  {errors.gstn}
                </span>
              )}
            </div>
          </div>

          {/* Action Row matching Figma button: width 125px, height 36px, background #F4BC43 */}
          <div
            style={{
              marginTop: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "36px",
                padding: "0 18px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                background: "#FFFFFF",
                color: "#011B2F",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                width: "125px",
                height: "36px",
                borderRadius: "8px",
                border: "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "18px",
                color: isSaving ? "#6B7280" : "#011B2F",
                cursor: isSaving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: isSaving ? "none" : "0 4px 10px rgba(244, 188, 67, 0.3)",
                transition: "all 0.2s ease",
                background: isSaving ? "#E5E7EB" : "#F4BC43",
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        ::placeholder {
          color: #6B7280 !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          opacity: 1 !important;
        }
        @keyframes customerModalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes customerModalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
