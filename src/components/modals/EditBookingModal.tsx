"use client";

import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import { Booking } from "@/types/booking";
import { colors, typography } from "@/lib/theme";

// ─── Schema-based validation 
interface FormErrors {
  customerName?: string;
  mobileNumber?: string;
}

function validate(customerName: string, mobileNumber: string): FormErrors {
  const errors: FormErrors = {};

  if (!customerName.trim()) {
    errors.customerName = "Customer name is required.";
  } else if (customerName.trim().length < 2) {
    errors.customerName = "Name must be at least 2 characters.";
  } else if (!/^[a-zA-Z\s.'-]+$/.test(customerName.trim())) {
    errors.customerName = "Name can only contain letters and spaces.";
  }

  if (!mobileNumber.trim()) {
    errors.mobileNumber = "Mobile number is required.";
  } else if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
    errors.mobileNumber = "Enter a valid 10-digit Indian mobile number.";
  }

  return errors;
}

// ─── Field component 
function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: colors.text.primary,
          fontFamily: typography.fontFamily.sans,
          display: "flex",
          alignItems: "center",
          gap: "2px",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span>
        )}
      </label>
      {children}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#EF4444",
            fontSize: "11px",
            fontFamily: typography.fontFamily.sans,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Common input style ─────────────────────────────────────────────────────
const inputStyle = (hasError: boolean): React.CSSProperties => ({
  height: "42px",
  borderRadius: "8px",
  border: `1.5px solid ${hasError ? "#EF4444" : "#D1D5DB"}`,
  padding: "0 14px",
  fontSize: "14px",
  fontFamily: typography.fontFamily.sans,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
  background: hasError ? "#FFF5F5" : "#FFFFFF",
});

// ─── Props ──────────────────────────────────────────────────────────────────
interface EditBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBooking: Booking) => void;
  isSaving?: boolean;
}

export default function EditBookingModal({
  booking,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: EditBookingModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ customerName: false, mobileNumber: false });

  // Re-seed form when a new booking is opened
  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customerName);
      setMobileNumber(booking.mobileNumber);
      setErrors({});
      setTouched({ customerName: false, mobileNumber: false });
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleBlur = (field: "customerName" | "mobileNumber") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate(customerName, mobileNumber);
    setErrors(errs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark both touched on submit attempt
    setTouched({ customerName: true, mobileNumber: true });
    const errs = validate(customerName, mobileNumber);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave({
      ...booking,
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#FFFFFF",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "18px",
                color: colors.sidebar.bg,
                margin: 0,
              }}
            >
              Edit Booking ({booking.id})
            </h3>
            <span style={{ fontSize: "12px", color: colors.text.muted, fontFamily: typography.fontFamily.sans }}>
              Update customer name and mobile number
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#F3F4F6",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.text.muted,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Customer Name */}
            <FormField
              label="Customer Name"
              required
              error={touched.customerName ? errors.customerName : undefined}
            >
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (touched.customerName) {
                    setErrors(validate(e.target.value, mobileNumber));
                  }
                }}
                onBlur={() => handleBlur("customerName")}
                placeholder="Enter customer full name"
                style={inputStyle(!!touched.customerName && !!errors.customerName)}
              />
            </FormField>

            {/* Mobile Number */}
            <FormField
              label="Mobile Number"
              required
              error={touched.mobileNumber ? errors.mobileNumber : undefined}
            >
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => {
                  // Only allow digits
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setMobileNumber(val);
                  if (touched.mobileNumber) {
                    setErrors(validate(customerName, val));
                  }
                }}
                onBlur={() => handleBlur("mobileNumber")}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                style={inputStyle(!!touched.mobileNumber && !!errors.mobileNumber)}
              />
            </FormField>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "40px",
                padding: "0 20px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                background: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                cursor: "pointer",
                color: "#374151",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                height: "40px",
                padding: "0 22px",
                borderRadius: "8px",
                border: "none",
                background: isSaving ? "#E5E7EB" : colors.brand.primary,
                color: isSaving ? "#6B7280" : colors.sidebar.bg,
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                cursor: isSaving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
