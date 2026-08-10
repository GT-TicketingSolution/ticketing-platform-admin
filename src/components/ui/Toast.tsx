"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { colors, typography } from "@/lib/theme";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "400px",
          width: "calc(100vw - 48px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          const bg = isSuccess
            ? "#F0FDF4"
            : isError
            ? "#FEF2F2"
            : "#F0F9FF";
          const border = isSuccess
            ? "#BBF7D0"
            : isError
            ? "#FECACA"
            : "#BAE6FD";
          const textColor = isSuccess
            ? "#15803D"
            : isError
            ? "#B91C1C"
            : "#0369A1";

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                background: bg,
                border: `1px solid ${border}`,
                color: textColor,
                padding: "12px 16px",
                borderRadius: "10px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 500,
                animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {isSuccess && <CheckCircle2 size={18} flex-shrink={0} />}
              {isError && <AlertCircle size={18} flex-shrink={0} />}
              {!isSuccess && !isError && <Info size={18} flex-shrink={0} />}
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: textColor,
                  opacity: 0.7,
                  padding: "2px",
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if provider isn't wrapping app
    return {
      showToast: (message: string, type: ToastType = "success") => {
        if (typeof window !== "undefined") {
          alert(`${type.toUpperCase()}: ${message}`);
        }
      },
    };
  }
  return context;
}
