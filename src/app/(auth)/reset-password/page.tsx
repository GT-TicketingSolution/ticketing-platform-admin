"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Lock,
  Eye,
  EyeOff,
  Globe,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Check,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { resetPasswordSchema, ResetPasswordFormData } from "../login/schema";
import { useResetPasswordMutation } from "@/hooks/useAuthQueries";
import { META_CONSTANTS } from "@/lib/metaConstant";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [selectedLang, setSelectedLang] = useState("English");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.title = META_CONSTANTS.resetPassword.fullTitle;
    }
  }, []);

  const resetPasswordMutation = useResetPasswordMutation();
  const isSubmitting = resetPasswordMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Live password strength checks
  const watchedPassword = useWatch({ control, name: "password", defaultValue: "" });
  const hasMinLength = watchedPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(watchedPassword);
  const hasNumber = /[0-9]/.test(watchedPassword);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setTokenError("Missing or invalid reset token. Please check your reset link.");
      return;
    }
    setTokenError(null);

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: data.password,
      });
      setIsSuccess(true);
    } catch {
      // Error is handled in mutation onError toast
    }
  };

  return (
    <>
      <title>{META_CONSTANTS.resetPassword.fullTitle}</title>
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
              <KeyRound size={34} color={colors.brand.primary} strokeWidth={1.8} />
            </div>

            {/* ── RESET PASSWORD FORM ── */}
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
                  Set New Password
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
                  Create a strong and secure new password for your account.
                </p>

                {tokenError && (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      background: "#FEF2F2",
                      border: `1px solid ${colors.status.error}`,
                      borderRadius: "8px",
                      color: colors.status.error,
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "13px",
                      marginBottom: "16px",
                      boxSizing: "border-box",
                    }}
                  >
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{tokenError}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* New Password Field */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label
                      htmlFor="password"
                      style={{
                        fontFamily: typography.fontFamily.sans,
                        fontWeight: typography.fontWeight.medium,
                        fontSize: "14px",
                        lineHeight: "18px",
                        color: colors.login.title,
                      }}
                    >
                      New Password
                    </label>

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: "42px",
                        border: `1px solid ${errors.password ? colors.status.error : colors.login.inputBorder}`,
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        padding: "0 12px",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s ease",
                      }}
                    >
                      <Lock
                        size={18}
                        color={colors.login.inputIcon}
                        style={{ flexShrink: 0, marginRight: "10px" }}
                      />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        {...register("password")}
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
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: colors.login.inputIcon,
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>

                    {errors.password && (
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
                        {errors.password.message}
                      </span>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label
                      htmlFor="confirmPassword"
                      style={{
                        fontFamily: typography.fontFamily.sans,
                        fontWeight: typography.fontWeight.medium,
                        fontSize: "14px",
                        lineHeight: "18px",
                        color: colors.login.title,
                      }}
                    >
                      Confirm New Password
                    </label>

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: "42px",
                        border: `1px solid ${errors.confirmPassword ? colors.status.error : colors.login.inputBorder}`,
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        padding: "0 12px",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s ease",
                      }}
                    >
                      <Lock
                        size={18}
                        color={colors.login.inputIcon}
                        style={{ flexShrink: 0, marginRight: "10px" }}
                      />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        {...register("confirmPassword")}
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
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: colors.login.inputIcon,
                        }}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>

                    {errors.confirmPassword && (
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
                        {errors.confirmPassword.message}
                      </span>
                    )}
                  </div>

                  {/* ── Password Requirements Checklist ── */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      border: "1px solid #E2E8F0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: colors.text.primary,
                        fontFamily: typography.fontFamily.sans,
                      }}
                    >
                      Password Requirements:
                    </span>

                    {/* At least 8 chars */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontFamily: typography.fontFamily.sans,
                        color: hasMinLength ? "#16A34A" : colors.text.muted,
                      }}
                    >
                      {hasMinLength ? (
                        <Check size={14} color="#16A34A" />
                      ) : (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "1px solid #CBD5E1",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      At least 8 characters
                    </div>

                    {/* Contains letter */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontFamily: typography.fontFamily.sans,
                        color: hasLetter ? "#16A34A" : colors.text.muted,
                      }}
                    >
                      {hasLetter ? (
                        <Check size={14} color="#16A34A" />
                      ) : (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "1px solid #CBD5E1",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      Contains at least one letter
                    </div>

                    {/* Contains number */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontFamily: typography.fontFamily.sans,
                        color: hasNumber ? "#16A34A" : colors.text.muted,
                      }}
                    >
                      {hasNumber ? (
                        <Check size={14} color="#16A34A" />
                      ) : (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "1px solid #CBD5E1",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      Contains at least one number
                    </div>
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
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
                    }}
                    className="reset-btn"
                  >
                    <KeyRound size={18} />
                    {isSubmitting ? "Resetting Password..." : "Reset Password"}
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
                  Password Reset Successfully!
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
                  Your password has been updated. You can now sign in with your new password.
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
                  className="reset-btn"
                >
                  <ArrowLeft size={18} />
                  Back to Sign In
                </Link>
              </div>
            )}
          </div>
        </main>

        {/* Button hover effect */}
        <style>{`
        .reset-btn:hover {
          background: ${colors.login.btnHoverBg} !important;
        }
        .reset-btn:active {
          transform: scale(0.99);
        }
      `}</style>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
