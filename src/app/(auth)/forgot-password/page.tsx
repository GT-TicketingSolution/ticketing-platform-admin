"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  Globe,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  SendHorizonal,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { forgotPasswordSchema, ForgotPasswordFormData } from "../login/schema";
import { useForgotPasswordMutation } from "@/hooks/useAuthQueries";

export default function ForgotPasswordPage() {
  const [selectedLang, setSelectedLang] = useState("English");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.title = "Forgot Password | Ticketing Solution";
    }
  }, []);

  const forgotPasswordMutation = useForgotPasswordMutation();
  const isSubmitting = forgotPasswordMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation.mutateAsync({
        email: data.email.trim(),
      });
      setIsSuccess(true);
    } catch {
      // Error is handled in mutation onError toast
    }
  };

  return (
    <>
      <title>Forgot Password | Ticketing Solution</title>
      <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        overflow: "hidden",
        fontFamily: typography.fontFamily.sans,
        boxSizing: "border-box",
        padding: "64px 16px 24px 16px",
      }}
    >
      {/* ── Background Image Layer ── */}
      <div
        style={{
          position: "absolute",
          inset: "-10px",
          backgroundImage: `url('/Assets/images/bg-img.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      {/* ── Top-Right Language Picker ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          zIndex: 20,
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setLangDropdownOpen((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(8px)",
              borderRadius: "20px",
              border: "1px solid rgba(23, 63, 99, 0.15)",
              cursor: "pointer",
              color: colors.login.langText,
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.medium,
              fontSize: "14px",
              padding: "6px 12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <Globe size={18} color={colors.login.langText} strokeWidth={1.8} />
            <span>{selectedLang}</span>
            <ChevronDown
              size={16}
              color={colors.login.langText}
              style={{
                transform: langDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {langDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: "#FFFFFF",
                borderRadius: "10px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                border: "1px solid #E5E7EB",
                padding: "6px 0",
                minWidth: "120px",
                zIndex: 30,
              }}
            >
              {["English", "Hindi"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang);
                    setLangDropdownOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 14px",
                    background: lang === selectedLang ? colors.bg.page : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: colors.login.title,
                    fontWeight: lang === selectedLang ? 600 : 400,
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Card ── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "450px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            background: colors.login.cardBg,
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(1, 27, 47, 0.12)",
            padding: "28px 28px 24px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxSizing: "border-box",
          }}
        >
          {/* ── Avatar Circle ── */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: colors.login.avatarBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              boxShadow: "0 4px 12px rgba(0, 42, 69, 0.2)",
              flexShrink: 0,
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill={colors.text.white}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" />
              <path d="M12 14C7.58172 14 4 16.6863 4 20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20C20 16.6863 16.4183 14 12 14Z" />
            </svg>
          </div>

          {/* ── FORGOT PASSWORD FORM ── */}
          {!isSuccess ? (
            <>
              {/* Back to Login */}
              <Link
                href="/login"
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: colors.brand.accent,
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.medium,
                  fontSize: "13px",
                  marginBottom: "12px",
                  textDecoration: "none",
                }}
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>

              <h1
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: "24px",
                  lineHeight: "30px",
                  color: colors.login.title,
                  margin: "0 0 6px 0",
                  textAlign: "center",
                }}
              >
                Forgot Password?
              </h1>

              <p
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.normal,
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: colors.login.subtitle,
                  margin: "0 0 24px 0",
                  textAlign: "center",
                  maxWidth: "320px",
                }}
              >
                Enter the email address linked to your account. We&apos;ll send you a password reset link.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                {/* Email Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label
                    htmlFor="email"
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontWeight: typography.fontWeight.medium,
                      fontSize: "14px",
                      lineHeight: "18px",
                      color: colors.login.title,
                    }}
                  >
                    Email Address
                  </label>

                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      height: "42px",
                      border: `1px solid ${errors.email ? colors.status.error : colors.login.inputBorder}`,
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      padding: "0 12px",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <Mail
                      size={18}
                      color={colors.login.inputIcon}
                      style={{ flexShrink: 0, marginRight: "10px" }}
                    />
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      {...register("email")}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontFamily: typography.fontFamily.sans,
                        fontSize: "14px",
                        color: colors.login.inputText,
                      }}
                    />
                  </div>

                  {errors.email && (
                    <span
                      style={{
                        fontFamily: typography.fontFamily.sans,
                        fontSize: "12px",
                        color: colors.status.error,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "1px",
                      }}
                    >
                      <AlertCircle size={13} />
                      {errors.email.message}
                    </span>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    height: "42px",
                    background: colors.login.btnBg,
                    color: colors.login.btnText,
                    border: "none",
                    borderRadius: "8px",
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: typography.fontWeight.bold,
                    fontSize: "16px",
                    lineHeight: "20px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    transition: "background 0.2s ease, transform 0.1s ease",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
                  }}
                  className="forgot-btn"
                >
                  <SendHorizonal size={18} />
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            /* ── SUCCESS STATE ── */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                textAlign: "center",
                padding: "12px 0",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#F0FDF4",
                  border: `2px solid ${colors.status.success}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={32} color={colors.status.success} />
              </div>

              <h2
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: "22px",
                  color: colors.login.title,
                  margin: 0,
                }}
              >
                Reset Link Sent!
              </h2>

              <p
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "14px",
                  color: colors.login.subtitle,
                  margin: 0,
                  maxWidth: "300px",
                  lineHeight: "20px",
                }}
              >
                A password reset link has been sent to your email address. Please check your inbox and follow the instructions.
              </p>

              <Link
                href="/login"
                style={{
                  marginTop: "8px",
                  width: "100%",
                  height: "42px",
                  background: colors.login.btnBg,
                  color: colors.login.btnText,
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
                className="forgot-btn"
              >
                <ArrowLeft size={18} />
                Back to Sign In
              </Link>
            </div>
          )}
        </div>

        {/* ── Footer Below Card ── */}
        {!isSuccess && (
          <div
            style={{
              marginTop: "16px",
              textAlign: "center",
              fontFamily: typography.fontFamily.sans,
              fontSize: "14px",
              lineHeight: "18px",
              fontWeight: typography.fontWeight.normal,
              color: colors.login.footerText,
            }}
          >
            Remembered your password?{" "}
            <Link
              href="/login"
              style={{
                color: colors.login.footerAdminLink,
                fontWeight: typography.fontWeight.semibold,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </div>
        )}
      </main>

      {/* Button hover effect */}
      <style>{`
        .forgot-btn:hover {
          background: ${colors.login.btnHoverBg} !important;
        }
        .forgot-btn:active {
          transform: scale(0.99);
        }
      `}</style>
    </div>
    </>
  );
}
