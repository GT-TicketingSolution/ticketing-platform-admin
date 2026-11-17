"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Upload, Crop, ZoomIn, ZoomOut, Check, X, Move, Trash2, RotateCcw } from "lucide-react";

interface AttractionImageCropperProps {
  value: string | null;
  onChange: (image: string | null) => void;
  disabled?: boolean;
}

/**
 * Creates a cropped image dataURL from natural pixel coordinates
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
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

  // White background in case the image is zoomed out smaller than crop box
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, targetW, targetH);

  // Draw image at offset
  ctx.drawImage(image, -pixelCrop.x, -pixelCrop.y);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function AttractionImageCropper({
  value,
  onChange,
  disabled = false,
}: AttractionImageCropperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full source image used for cropping
  const [sourceImage, setSourceImage] = useState<string | null>(value);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // react-easy-crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const prevValueRef = useRef<string | null>(value);

  // Sync external value ONLY when parent value actually changes from outside
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (value) {
        setSourceImage(value);
      } else {
        setSourceImage(null);
        setIsCropping(false);
      }
    }
  }, [value]);

  const onCropComplete = useCallback((_croppedArea: Area, currentCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(currentCroppedAreaPixels);
  }, []);

  // File loading
  const handleFile = (file: File) => {
    if (!file) return;
    const isImage = file.type ? file.type.startsWith("image/") : /\.(jpe?g|png|webp|gif|bmp|svg|jfif)$/i.test(file.name);
    if (!isImage) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setSourceImage(dataUrl);
      prevValueRef.current = dataUrl;
      // Immediately pass to parent so form state has the image
      onChange(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerBrowse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    fileInputRef.current?.click();
  };

  // Drag & drop file onto rectangle
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Commit crop
  const handleApplyCrop = async () => {
    if (!sourceImage || !croppedAreaPixels) {
      setIsCropping(false);
      return;
    }
    try {
      const croppedUrl = await getCroppedImg(sourceImage, croppedAreaPixels);
      prevValueRef.current = croppedUrl;
      onChange(croppedUrl);
      setIsCropping(false);
    } catch (err) {
      console.error("Cropping failed:", err);
      // Fallback to original image
      prevValueRef.current = sourceImage;
      onChange(sourceImage);
      setIsCropping(false);
    }
  };

  const handleCancelCrop = () => {
    if (value) {
      setSourceImage(value);
      setIsCropping(false);
    } else if (sourceImage) {
      // Keep uncropped image
      setIsCropping(false);
    } else {
      setSourceImage(null);
      setIsCropping(false);
      prevValueRef.current = null;
      onChange(null);
    }
  };

  const handleStartCropMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sourceImage && value) {
      setSourceImage(value);
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropping(true);
  };

  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSourceImage(null);
    setIsCropping(false);
    prevValueRef.current = null;
    onChange(null);
  };

  const displayImage = value || sourceImage;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "313px",
        height: "176px",
        background: isCropping ? "#0B1522" : isDragOver ? "#EFF6FF" : "#FFFFFF",
        border: isCropping
          ? "2px solid #2563EB"
          : isDragOver
          ? "2px dashed #2563EB"
          : "1.5px solid rgba(179, 175, 175, 0.51)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        userSelect: isCropping ? "none" : "auto",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
      }}
    >
      {/* ── MODE 1: In-Place Crop & Grab Mode (react-easy-crop) ── */}
      {isCropping && sourceImage ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Cropper
              image={sourceImage}
              crop={crop}
              zoom={zoom}
              aspect={313 / 176}
              minZoom={0.2}
              maxZoom={4}
              zoomSpeed={0.3}
              restrictPosition={false}
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
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
                  color: "rgba(0, 0, 0, 0.55)",
                },
              }}
            />
          </div>

          {/* Top Instruction Pill */}
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(12, 42, 66, 0.85)",
              color: "#FFFFFF",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "10px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              pointerEvents: "none",
              zIndex: 10,
              backdropFilter: "blur(4px)",
              letterSpacing: "0.2px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            }}
          >
            <Move size={11} color="#60A5FA" />
            <span>Grab to position</span>
          </div>

          {/* Bottom Zoom & Action Toolbar */}
          <div
            style={{
              position: "absolute",
              bottom: "6px",
              left: "6px",
              right: "6px",
              background: "rgba(12, 42, 66, 0.92)",
              backdropFilter: "blur(6px)",
              borderRadius: "6px",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
              zIndex: 10,
              boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
            }}
          >
            {/* Zoom Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "3px", flex: 1, minWidth: 0 }}>
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
                  padding: "2px",
                }}
                title="Zoom Out (More)"
              >
                <ZoomOut size={13} />
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
                  minWidth: "40px",
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
                  padding: "2px",
                }}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>

              <button
                type="button"
                onClick={handleResetCrop}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px",
                  marginLeft: "2px",
                }}
                title="Reset Position & Zoom"
              >
                <RotateCcw size={11} />
              </button>
            </div>

            {/* Action Buttons: Cancel & Crop */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleCancelCrop}
                style={{
                  background: "rgba(239, 68, 68, 0.9)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  lineHeight: 1,
                }}
                title="Cancel"
              >
                <X size={11} strokeWidth={2.5} />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={handleApplyCrop}
                style={{
                  background: "#16A34A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  lineHeight: 1,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
                title="Apply Crop"
              >
                <Check size={12} strokeWidth={2.5} />
                <span>Crop</span>
              </button>
            </div>
          </div>
        </>
      ) : displayImage ? (
        /* ── MODE 2: Existing / Cropped Image Preview Mode ── */
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImage}
            alt="Attraction Preview"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Action buttons (Crop, Change, Remove) */}
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              zIndex: 2,
            }}
          >
            {/* Crop Button to adjust / grab */}
            <button
              type="button"
              onClick={handleStartCropMode}
              style={{
                background: "rgba(30, 102, 245, 0.92)",
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              title="Crop and position image"
            >
              <Crop size={11} strokeWidth={2.2} />
              <span>Crop</span>
            </button>

            {/* Change Image Button */}
            <button
              type="button"
              onClick={triggerBrowse}
              style={{
                background: "rgba(12, 42, 66, 0.88)",
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              title="Choose a different image"
            >
              Change
            </button>

            {/* Remove Image Button */}
            <button
              type="button"
              onClick={handleRemove}
              style={{
                background: "rgba(220, 38, 38, 0.88)",
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              title="Remove image"
            >
              <Trash2 size={11} strokeWidth={2} />
              <span>Remove</span>
            </button>
          </div>
        </>
      ) : (
        /* ── MODE 3: Empty State (Upload Dropzone) ── */
        <>
          <Upload size={24} color="#2372A5" strokeWidth={1.8} />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "10px",
              color: "#011B2F",
              marginTop: "8px",
            }}
          >
            Drag & Drop Image here
          </span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "10px",
              color: "#011B2F",
              margin: "2px 0 6px 0",
            }}
          >
            or
          </span>
          <button
            type="button"
            onClick={triggerBrowse}
            style={{
              boxSizing: "border-box",
              width: "88px",
              height: "28px",
              border: "2px solid #2372A5",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "10px",
              color: "#2372A5",
              background: "transparent",
            }}
          >
            Browse File
          </button>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "10px",
              color: "rgba(107,114,128,0.68)",
              marginTop: "8px",
            }}
          >
            JPG, PNG or WEBP (Max. 5MB)
          </span>
        </>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        disabled={disabled}
      />
    </div>
  );
}
