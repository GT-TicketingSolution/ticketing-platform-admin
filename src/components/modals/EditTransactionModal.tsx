"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, Save } from "lucide-react";
import { Transaction, TransactionStatus } from "@/types/transaction";
import { colors, typography } from "@/lib/theme";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export default function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
  onSave,
}: EditTransactionModalProps) {
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  useEffect(() => {
    if (transaction) {
      setFormData({ ...transaction });
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.amount) return;

    onSave({
      ...transaction,
      ...formData,
      amount: Number(formData.amount),
    } as Transaction);
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
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "#FFFFFF",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CreditCard size={20} color="#0C2A42" />
            <h2
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "18px",
                color: "#0C2A42",
                margin: 0,
              }}
            >
              Edit Transaction ({transaction.id})
            </h2>
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
        <form onSubmit={handleSubmit}>
          <div
            style={{
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Customer Name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customerName || ""}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: "1px solid #D1D5DB",
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            {/* Amount & Payment Mode */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                  min={0}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Payment Mode
                </label>
                <select
                  value={formData.paymentMode || "Cash"}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentMode: e.target.value as Transaction["paymentMode"] })
                  }
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            {/* Status & Date Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Status
                </label>
                <select
                  value={formData.status || "Confirmed"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as TransactionStatus })
                  }
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Date & Time
                </label>
                <input
                  type="text"
                  value={formData.dateTime || ""}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 28px",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              background: "#F9FAFB",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "40px",
                padding: "0 18px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                height: "40px",
                padding: "0 22px",
                borderRadius: "6px",
                border: "none",
                background: "#0C2A42",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
