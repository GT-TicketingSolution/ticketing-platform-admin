"use client";

import { useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Check,
  AlertCircle,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Default profile state 
const defaultProfile = {
  name: "Amit Sharma",
  email: "amit@gmail.com",
  phone: "9876543210",
  role: "Admin",
};

// ── Reusable input field — defined at MODULE level so React never re-mounts it on re-render
function InputField({
  id,
  label,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  maxLength,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  maxLength?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "13px",
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          fontFamily: typography.fontFamily.sans,
        }}
      >
        {label} <span style={{ color: colors.status.error }}>*</span>
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "42px",
          border: `1.5px solid ${error ? colors.status.error : colors.login.inputBorder}`,
          borderRadius: "8px",
          padding: "0 12px",
          background: "#FFFFFF",
          transition: "border-color 0.2s ease",
        }}
      >
        <span style={{ display: "flex", marginRight: "10px", flexShrink: 0, color: colors.login.inputIcon }}>
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            fontSize: "14px",
            fontFamily: typography.fontFamily.sans,
            color: colors.text.primary,
            background: "transparent",
          }}
        />
      </div>
      {error && (
        <span
          style={{
            fontSize: "12px",
            color: colors.status.error,
            fontFamily: typography.fontFamily.sans,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <AlertCircle size={13} />
          {error}
        </span>
      )}
    </div>
  );
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const [formData, setFormData] = useState({ ...defaultProfile });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const avatarInitials = formData.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // ── Validation 
  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) {
      errs.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (formData.phone.length < 10) {
      errs.phone = "Phone must be 10 digits";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1600);
    }, 500);
  };

  const handleClose = () => {
    setErrors({});
    setSuccess(false);
    onClose();
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
        padding: "16px",
        background: "rgba(1, 27, 47, 0.65)",
        backdropFilter: "blur(4px)",
        animation: "epFadeIn 0.2s ease-out",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(1, 27, 47, 0.25)",
          overflow: "hidden",
          animation: "epSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "20px 24px",
            background: colors.sidebar.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Avatar initials badge */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: colors.sidebar.activeBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.sidebar.activeText,
                fontFamily: typography.fontFamily.sans,
                fontWeight: typography.fontWeight.bold,
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              {avatarInitials}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: typography.fontWeight.bold,
                  fontFamily: typography.fontFamily.sans,
                  color: "#FFFFFF",
                }}
              >
                Profile Settings
              </h3>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.6)",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Update your account details
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              cursor: "pointer",
              color: "rgba(255, 255, 255, 0.7)",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {/* Success Banner */}
          {success && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                background: "#F0FDF4",
                border: `1px solid ${colors.status.success}`,
                borderRadius: "10px",
                color: colors.status.success,
                fontFamily: typography.fontFamily.sans,
                fontWeight: typography.fontWeight.semibold,
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              <Check size={20} style={{ flexShrink: 0 }} />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InputField
              id="ep-name"
              label="Full Name"
              icon={<User size={16} />}
              placeholder="e.g. Amit Sharma"
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
              error={errors.name}
            />

            <InputField
              id="ep-email"
              label="Email Address"
              icon={<Mail size={16} />}
              type="email"
              placeholder="admin@gmail.com"
              value={formData.email}
              onChange={(v) => setFormData({ ...formData, email: v })}
              error={errors.email}
            />

            <InputField
              id="ep-phone"
              label="Phone Number"
              icon={<Phone size={16} />}
              placeholder="9876543210"
              value={formData.phone}
              maxLength={10}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  phone: v.replace(/\D/g, "").slice(0, 10),
                })
              }
              error={errors.phone}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                height: "40px",
                padding: "0 20px",
                borderRadius: "8px",
                border: `1px solid ${colors.login.inputBorder}`,
                background: "#FFFFFF",
                color: colors.text.primary,
                fontSize: "14px",
                fontWeight: typography.fontWeight.medium,
                cursor: "pointer",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              style={{
                height: "40px",
                padding: "0 22px",
                borderRadius: "8px",
                border: "none",
                background: colors.sidebar.activeBg,
                color: colors.sidebar.activeText,
                fontSize: "14px",
                fontWeight: typography.fontWeight.bold,
                cursor: isSubmitting || success ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: typography.fontFamily.sans,
                boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
                opacity: isSubmitting || success ? 0.85 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              <Check size={16} />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes epFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes epSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1);   }
        }
      `}</style>
    </div>
  );
}
