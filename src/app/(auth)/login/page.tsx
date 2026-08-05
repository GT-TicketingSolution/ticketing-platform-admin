"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, Globe, ChevronDown } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { loginSchema, LoginFormData, RoleType } from "./schema";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>("Admin");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    router.push("/ticket-booking");
  };

  return (
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
      {/* ── Background Image Layer (Natural image with subtle blur) ── */}
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

      {/* ── Top-Right Language Picker Header Bar ── */}
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

          {/* Language Dropdown */}
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

      {/* ── Main Login Container ── */}
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
        {/* ── Card ── */}
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
          {/* ── Logo / Avatar Circle (Ellipse 1) ── */}
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
            {/* Solid white user silhouette icon */}
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

          {/* ── Welcome Back Heading ── */}
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
            Welcome Back!
          </h1>

          {/* ── Subtitle ── */}
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.normal,
              fontSize: "14px",
              lineHeight: "19px",
              color: colors.login.subtitle,
              margin: "0 0 20px 0",
              textAlign: "center",
              maxWidth: "320px",
            }}
          >
            Login to continue managing tickets, bookings and visitors
          </p>

          {/* ── Role Selector Tabs (Component 4) ── */}
          <div
            style={{
              width: "100%",
              height: "40px",
              background: colors.login.roleContainerBg,
              border: `1px solid ${colors.login.roleBorder}`,
              borderRadius: "8px",
              display: "flex",
              padding: "3px",
              gap: "3px",
              boxSizing: "border-box",
              marginBottom: "18px",
            }}
          >
            {(["Admin", "Manager", "Staff"] as RoleType[]).map((role) => {
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  style={{
                    flex: 1,
                    border: isActive ? `1px solid ${colors.login.roleBorder}` : "none",
                    borderRadius: "6px",
                    background: isActive ? colors.login.roleActiveBg : "transparent",
                    color: isActive
                      ? colors.login.roleActiveText
                      : colors.login.roleInactiveText,
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: typography.fontWeight.medium,
                    fontSize: "14px",
                    lineHeight: "18px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {role}
                </button>
              );
            })}
          </div>

          {/* ── Login Form ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Email/Username Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                htmlFor="emailOrUsername"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.medium,
                  fontSize: "14px",
                  lineHeight: "18px",
                  color: colors.login.title,
                }}
              >
                Email/Username
              </label>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  height: "42px",
                  border: `1px solid ${
                    errors.emailOrUsername ? colors.status.error : colors.login.inputBorder
                  }`,
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
                  id="emailOrUsername"
                  type="text"
                  placeholder="Enter your email or username"
                  {...register("emailOrUsername")}
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

              {errors.emailOrUsername && (
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "12px",
                    color: colors.status.error,
                    marginTop: "1px",
                  }}
                >
                  {errors.emailOrUsername.message}
                </span>
              )}
            </div>

            {/* Password Field */}
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
                Password
              </label>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  height: "42px",
                  border: `1px solid ${
                    errors.password ? colors.status.error : colors.login.inputBorderActive
                  }`,
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
                  placeholder="Enter your password"
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
                    marginTop: "1px",
                  }}
                >
                  {errors.password.message}
                </span>
              )}

              {/* Forgot Password Link */}
              <div style={{ textAlign: "right", marginTop: "2px" }}>
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: typography.fontWeight.medium,
                    fontSize: "13px",
                    lineHeight: "16px",
                    color: colors.login.forgotPassword,
                    textDecoration: "none",
                  }}
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Login Submit Button */}
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
                boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
              }}
              className="login-btn"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>

        {/* ── Footer Link Below Card ── */}
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
          Don’t have an account?{" "}
          <a
            href="#contact-admin"
            onClick={(e) => {
              e.preventDefault();
            }}
            style={{
              color: colors.login.footerAdminLink,
              fontWeight: typography.fontWeight.semibold,
              textDecoration: "none",
            }}
          >
            Contact Administrator
          </a>
        </div>
      </main>

      {/* Button hover effect */}
      <style>{`
        .login-btn:hover {
          background: ${colors.login.btnHoverBg} !important;
        }
        .login-btn:active {
          transform: scale(0.99);
        }
      `}</style>
    </div>
  );
}
