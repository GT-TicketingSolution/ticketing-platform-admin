"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move, Crop } from "lucide-react";
import { useModalBodyLock } from "@/hooks/useModalBodyLock";

export type CropShape = "rect" | "round" | "rectangle" | "circle";

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  cropShape?: CropShape;
  aspect?: number;
  title?: string;
  subtitle?: string;
}

/**
 * Creates a cropped image data URL from natural pixel coordinates.
 * Supports rectangular (JPEG) and circular clipped (PNG with transparency).
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  shape: CropShape = "rect"
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });

  const targetW = Math.max(1, Math.round(pixelCrop.width));
  const targetH = Math.max(1, Math.round(pixelCrop.height));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageSrc;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const isCircle = shape === "round" || shape === "circle";

  if (isCircle) {
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.beginPath();
    ctx.arc(targetW / 2, targetH / 2, Math.min(targetW, targetH) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, -pixelCrop.x, -pixelCrop.y);
    return canvas.toDataURL("image/png");
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(image, -pixelCrop.x, -pixelCrop.y);
    return canvas.toDataURL("image/jpeg", 0.92);
  }
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  cropShape = "rect",
  aspect,
  title,
  subtitle,
}: ImageCropModalProps) {
  useModalBodyLock(isOpen);

  const isCircle = cropShape === "round" || cropShape === "circle";
  const easyCropShape: "rect" | "round" = isCircle ? "round" : "rect";
  const effectiveAspect = aspect ?? (isCircle ? 1 : 313 / 176);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleCropComplete = useCallback((_area: Area, currentCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(currentCroppedAreaPixels);
  }, []);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      onClose();
      return;
    }
    try {
      setIsProcessing(true);
      const croppedUrl = await getCroppedImg(imageSrc, croppedAreaPixels, cropShape);
      onCropComplete(croppedUrl);
      onClose();
    } catch (err) {
      console.error("Failed to crop image:", err);
      onCropComplete(imageSrc);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const defaultTitle = isCircle ? "Crop Visitor Category Picture" : "Crop Attraction Image";
  const defaultSubtitle = isCircle
    ? "Adjust position and zoom within the circular frame."
    : "Adjust position and zoom within the rectangular frame.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: "16px",
      }}
      onClick={(e) => {
        // Prevent outside click from accidentally closing while dragging
        e.stopPropagation();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          width: "100%",
          maxWidth: isCircle ? "560px" : "640px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          animation: "cropModalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: isCircle ? "#EFF6FF" : "#F0FDF4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Crop size={18} color={isCircle ? "#2563EB" : "#16A34A"} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#0C233C",
                  lineHeight: "22px",
                }}
              >
                {title || defaultTitle}
              </h3>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "#64748B",
                  lineHeight: "16px",
                }}
              >
                {subtitle || defaultSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9999px",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#94A3B8",
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Modal Body: Crop Viewport ── */}
        <div style={{ padding: "20px 24px 16px" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: isCircle ? "340px" : "320px",
              background: "#0B1522",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={effectiveAspect}
              cropShape={easyCropShape}
              showGrid={!isCircle}
              minZoom={0.2}
              maxZoom={4}
              zoomSpeed={0.25}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  inset: 0,
                  background: "#0B1522",
                },
                cropAreaStyle: {
                  border: "2px solid #3B82F6",
                  borderRadius: isCircle ? "9999px" : "8px",
                  boxShadow: "0 0 0 9999em rgba(0, 0, 0, 0.65)",
                },
              }}
            />

            {/* Floating Top Instruction Pill */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(12, 42, 66, 0.85)",
                color: "#FFFFFF",
                padding: "4px 12px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                pointerEvents: "none",
                zIndex: 10,
                backdropFilter: "blur(4px)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                letterSpacing: "0.2px",
              }}
            >
              <Move size={12} color="#60A5FA" />
              <span>Grab to position</span>
            </div>
          </div>

          {/* Controls Bar: Zoom Slider + Reset */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginTop: "12px",
              background: "#0C2A42",
              borderRadius: "10px",
              padding: "8px 14px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#CBD5E1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>

              <input
                type="range"
                min="0.2"
                max="4"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  height: "4px",
                  accentColor: "#3B82F6",
                  cursor: "pointer",
                }}
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, Number((z + 0.1).toFixed(2))))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#CBD5E1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginLeft: "4px",
                }}
                title="Reset Position & Zoom"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal Footer: Cancel & Apply ── */}
        <div
          style={{
            padding: "14px 24px 18px",
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            background: "#FFFFFF",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              height: "38px",
              padding: "0 20px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              background: "#FFFFFF",
              color: "#334155",
              fontWeight: 600,
              fontSize: "13px",
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing}
            style={{
              height: "38px",
              padding: "0 24px",
              background: isCircle ? "#2563EB" : "#16A34A",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "13px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{isProcessing ? "Cropping..." : isCircle ? "Crop Circle" : "Crop"}</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes cropModalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
