"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Crop, Trash2 } from "lucide-react";
import ImageCropModal from "@/components/modals/ImageCropModal";

interface AttractionImageCropperProps {
  value: string | null;
  onChange: (image: string | null) => void;
  disabled?: boolean;
}

export default function AttractionImageCropper({
  value,
  onChange,
  disabled = false,
}: AttractionImageCropperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full source image used for cropping
  const [sourceImage, setSourceImage] = useState<string | null>(value);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const prevValueRef = useRef<string | null>(value);

  // Sync external value when parent value changes
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (value) {
        setSourceImage(value);
      } else {
        setSourceImage(null);
        setIsCropModalOpen(false);
      }
    }
  }, [value]);

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
      onChange(dataUrl);
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

  const handleStartCropMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sourceImage && value) {
      setSourceImage(value);
    }
    setIsCropModalOpen(true);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSourceImage(null);
    setIsCropModalOpen(false);
    prevValueRef.current = null;
    onChange(null);
  };

  const displayImage = value || sourceImage;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: "313px" }}>
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
          background: isDragOver ? "#EFF6FF" : "#FFFFFF",
          border: isDragOver
            ? "2px dashed #2563EB"
            : "1.5px solid rgba(179, 175, 175, 0.51)",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
        }}
      >
        {displayImage ? (
          /* ── Existing / Cropped Image Preview Mode ── */
          /* eslint-disable-next-line @next/next/no-img-element */
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
        ) : (
          /* ── Empty State (Upload Dropzone) ── */
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

      {/* Action buttons (Crop, Change, Remove) OUTSIDE below the image preview */}
      {displayImage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "8px",
            width: "100%",
            maxWidth: "313px",
            boxSizing: "border-box",
          }}
        >
          {/* Crop option */}
          <button
            type="button"
            onClick={handleStartCropMode}
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            title="Crop Image"
          >
            <Crop size={12} strokeWidth={2.2} />
            <span>Crop</span>
          </button>

          {/* Change option */}
          <button
            type="button"
            onClick={triggerBrowse}
            style={{
              background: "#0C233C",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            title="Upload another image"
          >
            <Upload size={12} strokeWidth={2.2} />
            <span>Change</span>
          </button>

          {/* Remove option */}
          <button
            type="button"
            onClick={handleRemove}
            style={{
              background: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            title="Remove image"
          >
            <Trash2 size={12} strokeWidth={2.2} />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* Global Image Crop Modal in RECTANGLE shape */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={displayImage || sourceImage}
        cropShape="rect"
        aspect={313 / 176}
        title="Crop Attraction Image"
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={(croppedUrl) => {
          setSourceImage(croppedUrl);
          prevValueRef.current = croppedUrl;
          onChange(croppedUrl);
          setIsCropModalOpen(false);
        }}
      />
    </div>
  );
}
