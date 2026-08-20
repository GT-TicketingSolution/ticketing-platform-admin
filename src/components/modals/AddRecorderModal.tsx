"use client";

import React, { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";

export interface RecorderData {
  id: string;
  name: string;
  location: string;
  recorderType: "NVR (8 Channel)" | "NVR (16 Channel)";
  channelCount: 8 | 16;
  ipAddress: string;
  username: string;
  port: string;
}

interface AddRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecorder: (data: RecorderData) => void;
  initialData?: RecorderData | null;
  isLoading?: boolean;
}

export default function AddRecorderModal({
  isOpen,
  onClose,
  onAddRecorder,
  initialData,
  isLoading = false,
}: AddRecorderModalProps) {
  const { showToast } = useToast();
  const [recorderName, setRecorderName] = useState("");
  const [location, setLocation] = useState("");
  const [channelType, setChannelType] = useState<8 | 16>(8);
  const [ipAddress, setIpAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [port, setPort] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setRecorderName(initialData.name || "");
        setLocation(initialData.location || "");
        setChannelType(initialData.channelCount === 16 ? 16 : 8);
        setIpAddress(initialData.ipAddress || "");
        setUsername(initialData.username || "");
        setPort(initialData.port || "");
        setPassword("");
      } else {
        setRecorderName("");
        setLocation("");
        setChannelType(8);
        setIpAddress("");
        setUsername("");
        setPassword("");
        setPort("");
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recorderName.trim()) {
      showToast("Please enter a recorder name", "error");
      return;
    }
    if (!ipAddress.trim()) {
      showToast("Please enter an IP address", "error");
      return;
    }

    const newRecorder: RecorderData = {
      id: initialData?.id || `rec-${Date.now()}`,
      name: recorderName.trim(),
      location: location.trim() || "Nahargarh Fort, Jaipur",
      recorderType: channelType === 8 ? "NVR (8 Channel)" : "NVR (16 Channel)",
      channelCount: channelType,
      ipAddress: ipAddress.trim() || "192.168.1.100",
      username: username.trim() || "admin",
      port: port.trim() || "8000",
    };


    onAddRecorder(newRecorder);
    showToast(
      initialData ? "Recorder settings updated!" : "CCTV Recorder connected successfully!",
      "success"
    );
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(12, 42, 66, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          maxWidth: "551px",
          maxHeight: "90vh",
          background: "#FFFFFF",
          border: "1px solid rgba(0, 0, 0, 0.43)",
          boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
          borderRadius: "26px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 36px 12px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "25px",
              color: "#0C2A42",
            }}
          >
            {initialData ? "Edit Recorder Settings" : "Add Recorder"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#6B7280",
              padding: "4px",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: "0 36px 32px 36px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Recorder Name */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "18px",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Recorder Name<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter recorder name"
              value={recorderName}
              onChange={(e) => setRecorderName(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "#011B2F",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Location */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "18px",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Location<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Nahargarh Fort"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "#011B2F",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Recorder Type (Channels) */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "18px",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Recorder Type<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* 8 Channel Option */}
              <div
                onClick={() => setChannelType(8)}
                style={{
                  boxSizing: "border-box",
                  height: "69px",
                  background: channelType === 8 ? "#DBEEFF" : "#FFFFFF",
                  border: channelType === 8 ? "1.5px solid #011B2F" : "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Custom Radio Circle */}
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: "1.5px solid #173F63",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "2px",
                    flexShrink: 0,
                  }}
                >
                  {channelType === 8 && (
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#173F63" }} />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "14px",
                      lineHeight: "18px",
                      color: "#0C2A42",
                    }}
                  >
                    8 Channel
                  </div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: "10px",
                      lineHeight: "15px",
                      color: "rgba(107, 114, 128, 0.68)",
                      marginTop: "2px",
                    }}
                  >
                    Supports upto 8 cameras
                  </div>
                </div>
              </div>

              {/* 16 Channel Option */}
              <div
                onClick={() => setChannelType(16)}
                style={{
                  boxSizing: "border-box",
                  height: "69px",
                  background: channelType === 16 ? "#DBEEFF" : "#FFFFFF",
                  border: channelType === 16 ? "1.5px solid #011B2F" : "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Custom Radio Circle */}
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: "1.5px solid #173F63",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "2px",
                    flexShrink: 0,
                  }}
                >
                  {channelType === 16 && (
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#173F63" }} />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "14px",
                      lineHeight: "18px",
                      color: "#0C2A42",
                    }}
                  >
                    16 Channel
                  </div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: "10px",
                      lineHeight: "15px",
                      color: "rgba(107, 114, 128, 0.68)",
                      marginTop: "2px",
                    }}
                  >
                    Supports upto 16 cameras
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IP Address */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "18px",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              IP Address<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 192.161.1.100"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "#011B2F",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Username & Password Side by Side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Username<span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "12px",
                  color: "#011B2F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Password<span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "12px",
                  color: "#011B2F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Port */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "18px",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Port<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="8000"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "#011B2F",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                display: "block",
                marginTop: "4px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "#6B7280",
              }}
            >
              Default port is 8000
            </span>
          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "124px",
                height: "48px",
                background: "#FFFFFF",
                border: "0.5px solid #002A45",
                borderRadius: "4px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                minWidth: "153px",
                height: "48px",
                background: isLoading ? "#E5E7EB" : "#F4BC43",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: isLoading ? "#6B7280" : "#011B2F",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading ? "none" : "0 4px 12px rgba(244, 188, 67, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "0 18px",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span>{initialData ? "Saving..." : "Adding..."}</span>
                </>
              ) : (
                <span>{initialData ? "Save Changes" : "Add Recorder"}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
