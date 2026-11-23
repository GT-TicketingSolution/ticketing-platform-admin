"use client";

import React, { useState, useEffect } from "react";
import { X, Pencil, Calendar, ChevronUp, ChevronDown, User, Info, AlertCircle, Crop } from "lucide-react";
import { CategoryItem } from "./AddEditAttractionForm";
import { useModalBodyLock } from "@/hooks/useModalBodyLock";
import ImageCropModal from "./ImageCropModal";

export interface EditVisitorCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryItem | null;
  onSave: (category: CategoryItem) => void;
  existingCategories?: string[];
}

export type AddEditVisitorCategoryModalProps = EditVisitorCategoryModalProps;

export default function EditVisitorCategoryModal({
  isOpen,
  onClose,
  category,
  onSave,
  existingCategories = [],
}: EditVisitorCategoryModalProps) {
  useModalBodyLock(isOpen);

  const isEdit = Boolean(category && category.id);

  // Form states
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imageLink, setImageLink] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Base pricing & GST
  const [basePrice, setBasePrice] = useState("");
  const [applyGstOnBase, setApplyGstOnBase] = useState(false);
  const [cgst, setCgst] = useState("");
  const [sgst, setSgst] = useState("");
  const [igst, setIgst] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [sacCode, setSacCode] = useState("");

  // Seat allocation
  const [numberOfSeats, setNumberOfSeats] = useState("1");

  // Future price revision
  const [hasFuturePrice, setHasFuturePrice] = useState(false);
  const [revisionType, setRevisionType] = useState<"recurring" | "onetime">("recurring");
  const [increaseByType, setIncreaseByType] = useState<"percentage" | "amount">("percentage");
  const [percentageValue, setPercentageValue] = useState("");
  const [amountValue, setAmountValue] = useState("0");
  const [effectiveDate, setEffectiveDate] = useState("2027-01-01");
  const [repeatCount, setRepeatCount] = useState("");
  const [repeatUnit, setRepeatUnit] = useState("Months");

  // Future price GST
  const [applyGstOnFuture, setApplyGstOnFuture] = useState(false);
  const [futureCgst, setFutureCgst] = useState("");
  const [futureSgst, setFutureSgst] = useState("");
  const [futureIgst, setFutureIgst] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    basePrice?: string;
    numberOfSeats?: string;
  }>({});

  // Handler for Increase By toggle: disables the other and resets its value to 0
  const handleIncreaseByTypeChange = (type: "percentage" | "amount") => {
    setIncreaseByType(type);
    if (type === "percentage") {
      setAmountValue("0");
    } else {
      setPercentageValue("0");
    }
  };

  // Initialize or reset when modal opens or category changes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      return;
    }

    if (category && category.id) {
      // Edit Mode - populate from category
      setName(category.name || "");
      setImage(category.image || "");
      setImageLink(category.imageLink || null);
      setBasePrice(category.basePrice || "");
      setNumberOfSeats(category.numberOfSeats || "1");
      const hasHsn = Boolean(category.hsnCode && category.hsnCode !== "-");
      setApplyGstOnBase(hasHsn);
      setHsnCode(hasHsn ? category.hsnCode! : "");
      setSacCode(category.sacCode && category.sacCode !== "-" ? category.sacCode : "");
      setCgst("9.00");
      setSgst("9.00");
      setIgst("0.00");

      const isOneTime = category.futurePriceType === "onetime";
      setRevisionType(isOneTime ? "onetime" : "recurring");
      setEffectiveDate(category.effectiveFrom || (isOneTime ? "2026-12-15" : "2027-01-01"));

      const fPrice = category.futurePrice || "";
      if (fPrice && fPrice !== "00.00" && fPrice !== "0.00" && fPrice !== "0") {
        setHasFuturePrice(true);
        if (fPrice.includes("%")) {
          setIncreaseByType("percentage");
          setPercentageValue(fPrice.replace(/[^0-9.]/g, "") || "10.00");
          setAmountValue("0");
        } else if (Number(fPrice) > 0) {
          setIncreaseByType("amount");
          setAmountValue(Number(fPrice).toFixed(2));
          setPercentageValue("0");
        } else {
          setIncreaseByType("percentage");
          setPercentageValue("10.00");
          setAmountValue("0");
        }
      } else {
        setHasFuturePrice(false);
        setIncreaseByType("percentage");
        setPercentageValue("");
        setAmountValue("0");
      }
      setRepeatCount("3");
      setRepeatUnit("Months");
      setApplyGstOnFuture(false);
      setFutureCgst("9.00");
      setFutureSgst("9.00");
      setFutureIgst("0.00");
    } else {
      // Add Mode - all empty values and all toggles OFF initially
      setName("");
      setImage("");
      setImageLink(null);
      setBasePrice("");
      setApplyGstOnBase(false); // All toggles OFF initially as requested
      setCgst("");
      setSgst("");
      setIgst("");
      setHsnCode("");
      setSacCode("");
      setNumberOfSeats("1");
      setHasFuturePrice(false); // OFF initially
      setRevisionType("recurring");
      setIncreaseByType("percentage");
      setPercentageValue("");
      setAmountValue("0");
      setEffectiveDate("2027-01-01");
      setRepeatCount("");
      setRepeatUnit("Months");
      setApplyGstOnFuture(false); // OFF initially
      setFutureCgst("");
      setFutureSgst("");
      setFutureIgst("");
    }
    setErrors({});
  }, [category, isOpen]);

  if (!isOpen) return null;

  // Dynamic Category Name Placeholder based on non-added categories
  const CANDIDATE_NAMES = ["Adult", "Child", "Foreigner", "Student", "Senior Citizen", "VIP", "Infant"];
  const missingCandidate = CANDIDATE_NAMES.find(
    (cand) => !existingCategories.some((ex) => ex.toLowerCase() === cand.toLowerCase())
  );
  const categoryNamePlaceholder = isEdit
    ? "e.g. Adult, Child, Foreigner"
    : `e.g. ${missingCandidate || "Adult"}`;

  // Handle avatar upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (!result) return;
      setImage(result);
      setImageLink(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Calculations
  const numBase = parseFloat(basePrice) || 0;
  const totalBaseGstPct = applyGstOnBase
    ? (parseFloat(cgst) || 0) + (parseFloat(sgst) || 0) + (parseFloat(igst) || 0)
    : 0;
  const calculatedTotalPrice = numBase + (numBase * totalBaseGstPct) / 100;

  // Future price calculations
  const futureIncreaseAmt =
    increaseByType === "percentage"
      ? (numBase * (parseFloat(percentageValue) || 0)) / 100
      : parseFloat(amountValue) || 0;

  const rawFutureBase = numBase + futureIncreaseAmt;
  const totalFutureGstPct = applyGstOnFuture
    ? (parseFloat(futureCgst) || 0) + (parseFloat(futureSgst) || 0) + (parseFloat(futureIgst) || 0)
    : 0;
  const calculatedFutureTotalPrice = rawFutureBase + (rawFutureBase * totalFutureGstPct) / 100;

  const filterDecimal = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setName(val);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = filterDecimal(e.target.value);
    setBasePrice(val);
    if (errors.basePrice) {
      setErrors((prev) => ({ ...prev, basePrice: undefined }));
    }
  };

  const handleSeatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setNumberOfSeats(val);
    if (errors.numberOfSeats) {
      setErrors((prev) => ({ ...prev, numberOfSeats: undefined }));
    }
  };

  // Save handler
  const handleSave = () => {
    const newErrors: { name?: string; basePrice?: string; numberOfSeats?: string } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = "Category name is required";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Category name must be at least 2 characters";
    } else {
      const isDuplicate = existingCategories.some(
        (existing) => existing.toLowerCase() === trimmedName.toLowerCase() && existing.toLowerCase() !== (category?.name || "").toLowerCase()
      );
      if (isDuplicate) {
        newErrors.name = "A category with this name already exists";
      }
    }

    if (!basePrice || parseFloat(basePrice) <= 0) {
      newErrors.basePrice = "Base price is required and must be greater than 0";
    }

    const seatsNum = parseInt(numberOfSeats, 10);
    if (!numberOfSeats || isNaN(seatsNum) || seatsNum < 1) {
      newErrors.numberOfSeats = "Seats must be at least 1";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let futurePriceVal = "00.00";
    if (hasFuturePrice) {
      if (increaseByType === "percentage") {
        futurePriceVal = percentageValue ? `+${parseFloat(percentageValue) || 0}%` : "00.00";
      } else {
        futurePriceVal = amountValue ? Number(amountValue || 0).toFixed(2) : "00.00";
      }
    }

    const savedCategory: CategoryItem = {
      id: isEdit && category ? category.id : `cat_${Date.now()}`,
      name: trimmedName,
      image: image || "",
      imageLink: imageLink ?? (category ? category.imageLink : null),
      basePrice: Number(numBase).toFixed(2),
      numberOfSeats: String(Math.max(1, seatsNum || 1)),
      hsnCode: applyGstOnBase ? (hsnCode.trim() || "-") : "-",
      sacCode: applyGstOnBase ? (sacCode.trim() || "-") : "-",
      futurePriceType: hasFuturePrice ? revisionType : "recurring",
      effectiveFrom: hasFuturePrice ? effectiveDate : "",
      futurePrice: futurePriceVal,
    };

    onSave(savedCategory);
    onClose();
  };

  return (
    <div
      className="add-edit-cat-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "16px",
      }}
    >
      <div
        className="add-edit-cat-modal-dialog"
        style={{
          background: "#FFFFFF",
          border: "1px solid #F1F5F9",
          boxShadow: "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "960px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div
          className="add-edit-cat-modal-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "24px 32px 16px",
            borderBottom: "1px solid #F1F5F9",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: "30px",
                letterSpacing: "-0.55px",
                color: "#0C233C",
              }}
            >
              {isEdit ? "Edit Visitor Category" : "Add Visitor Category"}
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "20px",
                color: "#64748B",
              }}
            >
              {isEdit
                ? "Update the category details, pricing, GST, future price and seat allocation."
                : "Configure the category details, pricing, GST, future price and seat allocation."}
            </p>
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
              transition: "background 0.15s ease",
            }}
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Modal Body Content (Scrollable) ── */}
        <div
          className="add-edit-cat-modal-body"
          style={{
            padding: "20px 32px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}
        >
          {/* 1. Top Info Row: Avatar + Name + Live Category Preview Card */}
          <div
            className="modal-top-row"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div
              className="modal-top-left"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "20px",
                flex: "1 1 500px",
                minHeight: "84px",
              }}
            >
              {/* Avatar with pencil edit badge and crop button below */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  marginTop: "4px",
                }}
              >
                {/* 80x80 Circle Avatar with pencil badge */}
                <div
                  style={{
                    position: "relative",
                    width: "80px",
                    height: "80px",
                    borderRadius: "9999px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    onClick={() => {
                      document.getElementById("add-edit-cat-avatar-file")?.click();
                    }}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "9999px",
                      overflow: "hidden",
                      background: "#F1F5F9",
                      boxShadow: "0px 0px 0px 2px #F1F5F9, 0px 1px 2px rgba(0, 0, 0, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    title="Click to select image"
                  >
                    {image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image}
                        alt={name || "Visitor Category"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <User size={38} color="#64748B" />
                    )}
                  </div>

                  {/* Initial & always badge: Pencil icon to upload/change photo */}
                  <label
                    htmlFor="add-edit-cat-avatar-file"
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: 0,
                      width: "28px",
                      height: "28px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                      borderRadius: "9999px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      zIndex: 2,
                    }}
                    title="Upload / Change photo"
                  >
                    <Pencil size={13} color="#334155" />
                  </label>
                  <input
                    id="add-edit-cat-avatar-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Below circle image: Crop Button (Shown ONLY when image is uploaded/selected) */}
                {image && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsCropModalOpen(true);
                    }}
                    style={{
                      background: "#2563EB",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      lineHeight: "14px",
                    }}
                    title="Crop photo"
                  >
                    <Crop size={12} strokeWidth={2.2} />
                    <span>Crop</span>
                  </button>
                )}
              </div>

              {/* Category Name Input (Letters only) */}
              <div className="modal-cat-name-field" style={{ flex: "1 1 300px", maxWidth: "384px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    color: "#1E293B",
                    marginBottom: "6px",
                  }}
                >
                  CATEGORY NAME <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  placeholder={categoryNamePlaceholder}
                  onChange={handleNameChange}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    height: "46px",
                    background: "#FFFFFF",
                    border: errors.name ? "1.5px solid #DC2626" : "1px solid #CBD5E1",
                    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontWeight: 500,
                    fontSize: "15px",
                    color: "#1E293B",
                    outline: "none",
                  }}
                />
                {errors.name && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "5px",
                      color: "#DC2626",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={13} />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Visitor Category Live Preview Badge */}
            <div
              className="modal-preview-badge"
              style={{
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#EEF5FC",
                border: "1px solid rgba(219, 234, 254, 0.9)",
                boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
                borderRadius: "12px",
                padding: "12px 16px",
                minWidth: "280px",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "9999px",
                  background: "#DBEAFE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Info size={13} color="#1D4ED8" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "12px", color: "#0F172A", lineHeight: "16px" }}>
                  Visitor Category Preview
                </div>
                <div style={{ fontWeight: 400, fontSize: "12px", color: "#334155", lineHeight: "18px", marginTop: "2px" }}>
                  {name || "New Category"} • Base: ₹{numBase.toFixed(2)} • Total: ₹{calculatedTotalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Middle Section: Pricing & GST Left Card + Seat Allocation Right Card */}
          <div
            className="modal-middle-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.65fr 0.95fr",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            {/* Pricing & GST Left Card */}
            <div
              style={{
                boxSizing: "border-box",
                background: "#FFFFFF",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Header & GST Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#0C233C" }}>
                  Pricing & GST
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#334155" }}>
                    Apply GST on Base Price?
                  </span>
                  <button
                    type="button"
                    onClick={() => setApplyGstOnBase(!applyGstOnBase)}
                    style={{
                      width: "44px",
                      height: "24px",
                      borderRadius: "9999px",
                      background: applyGstOnBase ? "#22C55E" : "#CBD5E1",
                      border: "none",
                      padding: "2px",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "9999px",
                        background: "#FFFFFF",
                        boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
                        transform: applyGstOnBase ? "translateX(20px)" : "translateX(0px)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Price Inputs Row */}
              <div className="pricing-gst-inputs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Base Price (₹) <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={basePrice}
                    placeholder="0.00"
                    onChange={handleBasePriceChange}
                    style={{
                      width: "100%",
                      height: "38px",
                      border: errors.basePrice ? "1.5px solid #DC2626" : "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "0 8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      textAlign: "center",
                      color: "#1E293B",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {errors.basePrice && (
                    <div style={{ color: "#DC2626", fontSize: "11px", marginTop: "3px" }}>{errors.basePrice}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    CGST (%)
                  </label>
                  <input
                    type="text"
                    value={cgst}
                    placeholder="9.00"
                    disabled={!applyGstOnBase}
                    onChange={(e) => setCgst(filterDecimal(e.target.value))}
                    style={{
                      width: "100%",
                      height: "38px",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "0 8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      textAlign: "center",
                      color: applyGstOnBase ? "#1E293B" : "#94A3B8",
                      background: applyGstOnBase ? "#FFFFFF" : "#F8FAFC",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    SGST (%)
                  </label>
                  <input
                    type="text"
                    value={sgst}
                    placeholder="9.00"
                    disabled={!applyGstOnBase}
                    onChange={(e) => setSgst(filterDecimal(e.target.value))}
                    style={{
                      width: "100%",
                      height: "38px",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "0 8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      textAlign: "center",
                      color: applyGstOnBase ? "#1E293B" : "#94A3B8",
                      background: applyGstOnBase ? "#FFFFFF" : "#F8FAFC",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    IGST (%)
                  </label>
                  <input
                    type="text"
                    value={igst}
                    placeholder="0.00"
                    disabled={!applyGstOnBase}
                    onChange={(e) => setIgst(filterDecimal(e.target.value))}
                    style={{
                      width: "100%",
                      height: "38px",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "0 8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      textAlign: "center",
                      color: applyGstOnBase ? "#1E293B" : "#94A3B8",
                      background: applyGstOnBase ? "#FFFFFF" : "#F8FAFC",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* HSN & SAC Interactive Container */}
              <div
                style={{
                  background: "#F8FBFE",
                  border: "1px solid #DBEAFE",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#1E293B", marginBottom: "2px" }}>
                    HSN Code
                  </div>
                  <input
                    type="text"
                    value={applyGstOnBase ? hsnCode : "-"}
                    disabled={!applyGstOnBase}
                    onChange={(e) => setHsnCode(e.target.value)}
                    style={{
                      width: "100%",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: applyGstOnBase ? "#1E293B" : "#94A3B8",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: applyGstOnBase ? "text" : "not-allowed",
                    }}
                  />
                </div>

                <div style={{ borderLeft: "1px solid rgba(191, 219, 254, 0.8)", paddingLeft: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#1E293B", marginBottom: "2px" }}>
                    SAC Code
                  </div>
                  <input
                    type="text"
                    value={applyGstOnBase ? sacCode : "-"}
                    disabled={!applyGstOnBase}
                    onChange={(e) => setSacCode(e.target.value)}
                    style={{
                      width: "100%",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: applyGstOnBase ? "#1E293B" : "#94A3B8",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: applyGstOnBase ? "text" : "not-allowed",
                    }}
                  />
                </div>
              </div>

              {/* Total Price Calculation Row */}
              <div
                style={{
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "#E8F1FC",
                  border: "1px solid rgba(219, 234, 254, 0.8)",
                  borderRadius: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "12px", color: "#0C233C" }}>Total Price</span>
                  <Info size={12} color="#94A3B8" />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "18px",
                    letterSpacing: "-0.45px",
                    color: "#0C233C",
                  }}
                >
                  ₹{calculatedTotalPrice.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Seat Allocation Right Card */}
            <div
              style={{
                boxSizing: "border-box",
                background: "#FFFFFF",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#0C233C",
                  borderBottom: "1px solid #F1F5F9",
                  paddingBottom: "12px",
                }}
              >
                Seat Allocation
              </h3>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  No. of Seats <span style={{ color: "#DC2626" }}>*</span>
                </label>

                {/* Numeric seat stepper */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: errors.numberOfSeats ? "1.5px solid #DC2626" : "1px solid #CBD5E1",
                    borderRadius: "8px",
                    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
                    overflow: "hidden",
                    height: "38px",
                  }}
                >
                  <input
                    type="text"
                    value={numberOfSeats}
                    onChange={handleSeatsChange}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: "0 12px",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#1E293B",
                    }}
                  />
                  <div
                    style={{
                      width: "28px",
                      borderLeft: "1px solid #E2E8F0",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setNumberOfSeats(String((parseInt(numberOfSeats, 10) || 0) + 1))}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <ChevronUp size={12} color="#475569" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNumberOfSeats(String(Math.max(1, (parseInt(numberOfSeats, 10) || 1) - 1)))}
                      style={{
                        flex: 1,
                        border: "none",
                        borderTop: "1px solid #E2E8F0",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <ChevronDown size={12} color="#475569" />
                    </button>
                  </div>
                </div>
                {errors.numberOfSeats && (
                  <div style={{ color: "#DC2626", fontSize: "11px", marginTop: "3px" }}>{errors.numberOfSeats}</div>
                )}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  lineHeight: "16px",
                  color: "#94A3B8",
                }}
              >
                Specifies the physical capacity deduction per visitor category booking.
              </p>
            </div>
          </div>

          {/* 3. Future Price Revision Section */}
          <div
            style={{
              boxSizing: "border-box",
              background: "#FFFFFF",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Section Title & Description */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#0C233C" }}>
                  Future Price (Price Revision)
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Configure a future price for this category. Choose either a recurring price change or a one-time price change.
                </p>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setHasFuturePrice(!hasFuturePrice)}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "9999px",
                  background: hasFuturePrice ? "#22C55E" : "#CBD5E1",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "9999px",
                    background: "#FFFFFF",
                    boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
                    transform: hasFuturePrice ? "translateX(20px)" : "translateX(0px)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
            </div>

            {hasFuturePrice && (
              <>
                {/* Revision Mode Selection (Recurring vs One-Time) */}
                <div
                  className="revision-mode-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  {/* Option 1: Recurring */}
                  <div
                    onClick={() => setRevisionType("recurring")}
                    style={{
                      boxSizing: "border-box",
                      border: revisionType === "recurring" ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                      background: revisionType === "recurring" ? "rgba(239, 246, 255, 0.4)" : "#FFFFFF",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "9999px",
                        border: revisionType === "recurring" ? "2px solid #2563EB" : "2px solid #CBD5E1",
                        background: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                    >
                      {revisionType === "recurring" && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "#2563EB" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "12px", color: "#0F172A", lineHeight: "15px" }}>
                        Recurring
                      </div>
                      <div style={{ fontWeight: 400, fontSize: "11px", color: "#64748B", lineHeight: "16px", marginTop: "2px" }}>
                        Price increases automatically at a fixed interval
                      </div>
                    </div>
                  </div>

                  {/* Option 2: One Time */}
                  <div
                    onClick={() => setRevisionType("onetime")}
                    style={{
                      boxSizing: "border-box",
                      border: revisionType === "onetime" ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                      background: revisionType === "onetime" ? "rgba(239, 246, 255, 0.4)" : "#FFFFFF",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "9999px",
                        border: revisionType === "onetime" ? "2px solid #2563EB" : "2px solid #CBD5E1",
                        background: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                    >
                      {revisionType === "onetime" && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "#2563EB" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "12px", color: "#0F172A", lineHeight: "15px" }}>
                        One Time
                      </div>
                      <div style={{ fontWeight: 400, fontSize: "11px", color: "#64748B", lineHeight: "16px", marginTop: "2px" }}>
                        Increase price once on a selected date.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-card: Inputs for Recurring vs One Time */}
                {revisionType === "recurring" ? (
                  /* ── RECURRING INPUTS ── */
                  <div
                    className="future-inputs-row"
                    style={{
                      background: "#F8FBFE",
                      border: "1px solid #DBEAFE",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Column 1: Increase By */}
                    <div className="future-inc-by-col" style={{ flex: "1 1 300px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                        Increase By <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {/* Option 1: Percentage */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: "10px" }}>
                          <label
                            onClick={() => handleIncreaseByTypeChange("percentage")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              color: increaseByType === "percentage" ? "#1E293B" : "#64748B",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <input
                              type="radio"
                              name="inc-type"
                              checked={increaseByType === "percentage"}
                              onChange={() => handleIncreaseByTypeChange("percentage")}
                              style={{ accentColor: "#2563EB", cursor: "pointer" }}
                            />
                            Percentage (of Base Price)
                          </label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: increaseByType === "percentage" ? "#FFFFFF" : "#F8FAFC",
                              border: increaseByType === "percentage" ? "1px solid #CBD5E1" : "1px solid #E2E8F0",
                              borderRadius: "6px",
                              overflow: "hidden",
                              width: "140px",
                              height: "30px",
                              flexShrink: 0,
                            }}
                          >
                            <input
                              type="text"
                              value={increaseByType === "percentage" ? percentageValue : (percentageValue || "0")}
                              placeholder="10.00"
                              disabled={increaseByType !== "percentage"}
                              onFocus={(e) => {
                                if (e.target.value === "0") setPercentageValue("");
                              }}
                              onChange={(e) => setPercentageValue(filterDecimal(e.target.value))}
                              style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                padding: "0 8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "percentage" ? "#1E293B" : "#94A3B8",
                                background: "transparent",
                                textAlign: "center",
                                cursor: increaseByType === "percentage" ? "text" : "not-allowed",
                              }}
                            />
                            <div
                              style={{
                                background: increaseByType === "percentage" ? "#F1F5F9" : "#F8FAFC",
                                borderLeft: "1px solid #E2E8F0",
                                padding: "0 10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "percentage" ? "#475569" : "#94A3B8",
                                lineHeight: "30px",
                              }}
                            >
                              %
                            </div>
                          </div>
                        </div>

                        {/* Option 2: Amount */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: "10px" }}>
                          <label
                            onClick={() => handleIncreaseByTypeChange("amount")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              color: increaseByType === "amount" ? "#1E293B" : "#64748B",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <input
                              type="radio"
                              name="inc-type"
                              checked={increaseByType === "amount"}
                              onChange={() => handleIncreaseByTypeChange("amount")}
                              style={{ accentColor: "#2563EB", cursor: "pointer" }}
                            />
                            Amount (₹)
                          </label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: increaseByType === "amount" ? "#FFFFFF" : "#F8FAFC",
                              border: increaseByType === "amount" ? "1px solid #CBD5E1" : "1px solid #E2E8F0",
                              borderRadius: "6px",
                              overflow: "hidden",
                              width: "140px",
                              height: "30px",
                              flexShrink: 0,
                            }}
                          >
                            <input
                              type="text"
                              value={increaseByType === "amount" ? amountValue : (amountValue || "0")}
                              placeholder="20.00"
                              disabled={increaseByType !== "amount"}
                              onFocus={(e) => {
                                if (e.target.value === "0") setAmountValue("");
                              }}
                              onChange={(e) => setAmountValue(filterDecimal(e.target.value))}
                              style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                padding: "0 8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "amount" ? "#1E293B" : "#94A3B8",
                                background: "transparent",
                                textAlign: "center",
                                cursor: increaseByType === "amount" ? "text" : "not-allowed",
                              }}
                            />
                            <div
                              style={{
                                background: increaseByType === "amount" ? "#F1F5F9" : "#F8FAFC",
                                borderLeft: "1px solid #E2E8F0",
                                padding: "0 10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "amount" ? "#475569" : "#94A3B8",
                                lineHeight: "30px",
                              }}
                            >
                              ₹
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="divider-vert" style={{ width: "1px", height: "64px", background: "#E2E8F0" }} />

                    {/* Column 2: Start From */}
                    <div className="future-start-from-col" style={{ flex: "1 1 180px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                        Start From <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#FFFFFF",
                          border: "1px solid #CBD5E1",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          height: "34px",
                          boxSizing: "border-box",
                        }}
                      >
                        <Calendar size={14} color="#94A3B8" />
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          style={{
                            border: "none",
                            outline: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#1E293B",
                            width: "100%",
                            background: "transparent",
                          }}
                        />
                      </div>
                    </div>

                    <div className="divider-vert" style={{ width: "1px", height: "64px", background: "#E2E8F0" }} />

                    {/* Column 3: Repeat Every (user can type number) */}
                    <div className="future-repeat-col" style={{ flex: "1 1 200px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                        Repeat Every <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          value={repeatCount}
                          placeholder="3"
                          onChange={(e) => setRepeatCount(e.target.value.replace(/\D/g, ""))}
                          style={{
                            width: "56px",
                            height: "34px",
                            background: "#FFFFFF",
                            border: "1px solid #CBD5E1",
                            borderRadius: "8px",
                            padding: "0 8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#1E293B",
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                        <select
                          value={repeatUnit}
                          onChange={(e) => setRepeatUnit(e.target.value)}
                          style={{
                            flex: 1,
                            height: "34px",
                            background: "#FFFFFF",
                            border: "1px solid #CBD5E1",
                            borderRadius: "8px",
                            padding: "0 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#1E293B",
                            outline: "none",
                          }}
                        >
                          <option value="Days">Days</option>
                          <option value="Weeks">Weeks</option>
                          <option value="Months">Months</option>
                          <option value="Years">Years</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── ONE TIME INPUTS ── */
                  <div
                    className="future-inputs-row"
                    style={{
                      background: "#F8FBFE",
                      border: "1px solid #DBEAFE",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "24px",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Column 1: Increase By */}
                    <div className="future-inc-by-onetime-col" style={{ flex: "1 1 440px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                        Increase By <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {/* Option 1: Percentage */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: "10px" }}>
                          <label
                            onClick={() => handleIncreaseByTypeChange("percentage")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              color: increaseByType === "percentage" ? "#1E293B" : "#64748B",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <input
                              type="radio"
                              name="inc-type-onetime"
                              checked={increaseByType === "percentage"}
                              onChange={() => handleIncreaseByTypeChange("percentage")}
                              style={{ accentColor: "#2563EB", cursor: "pointer" }}
                            />
                            Percentage (of Base Price)
                          </label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: increaseByType === "percentage" ? "#FFFFFF" : "#F8FAFC",
                              border: increaseByType === "percentage" ? "1px solid #CBD5E1" : "1px solid #E2E8F0",
                              borderRadius: "6px",
                              overflow: "hidden",
                              width: "176px",
                              height: "30px",
                              flexShrink: 0,
                            }}
                          >
                            <input
                              type="text"
                              value={increaseByType === "percentage" ? percentageValue : (percentageValue || "0")}
                              placeholder="10.00"
                              disabled={increaseByType !== "percentage"}
                              onFocus={(e) => {
                                if (e.target.value === "0") setPercentageValue("");
                              }}
                              onChange={(e) => setPercentageValue(filterDecimal(e.target.value))}
                              style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                padding: "0 8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "percentage" ? "#1E293B" : "#94A3B8",
                                background: "transparent",
                                textAlign: "center",
                                cursor: increaseByType === "percentage" ? "text" : "not-allowed",
                              }}
                            />
                            <div
                              style={{
                                background: increaseByType === "percentage" ? "#F1F5F9" : "#F8FAFC",
                                borderLeft: "1px solid #E2E8F0",
                                padding: "0 10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "percentage" ? "#475569" : "#94A3B8",
                                lineHeight: "30px",
                              }}
                            >
                              %
                            </div>
                          </div>
                        </div>

                        {/* Option 2: Amount */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: "10px" }}>
                          <label
                            onClick={() => handleIncreaseByTypeChange("amount")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              color: increaseByType === "amount" ? "#1E293B" : "#64748B",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <input
                              type="radio"
                              name="inc-type-onetime"
                              checked={increaseByType === "amount"}
                              onChange={() => handleIncreaseByTypeChange("amount")}
                              style={{ accentColor: "#2563EB", cursor: "pointer" }}
                            />
                            Amount (₹)
                          </label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: increaseByType === "amount" ? "#FFFFFF" : "#F8FAFC",
                              border: increaseByType === "amount" ? "1px solid #CBD5E1" : "1px solid #E2E8F0",
                              borderRadius: "6px",
                              overflow: "hidden",
                              width: "176px",
                              height: "30px",
                              flexShrink: 0,
                            }}
                          >
                            <input
                              type="text"
                              value={increaseByType === "amount" ? amountValue : (amountValue || "0")}
                              placeholder="20.00"
                              disabled={increaseByType !== "amount"}
                              onFocus={(e) => {
                                if (e.target.value === "0") setAmountValue("");
                              }}
                              onChange={(e) => setAmountValue(filterDecimal(e.target.value))}
                              style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                padding: "0 8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "amount" ? "#1E293B" : "#94A3B8",
                                background: "transparent",
                                textAlign: "center",
                                cursor: increaseByType === "amount" ? "text" : "not-allowed",
                              }}
                            />
                            <div
                              style={{
                                background: increaseByType === "amount" ? "#F1F5F9" : "#F8FAFC",
                                borderLeft: "1px solid #E2E8F0",
                                padding: "0 10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: increaseByType === "amount" ? "#475569" : "#94A3B8",
                                lineHeight: "30px",
                              }}
                            >
                              ₹
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="divider-vert" style={{ width: "1px", height: "80px", background: "#E2E8F0" }} />

                    {/* Column 2: Effective On */}
                    <div className="future-effective-onetime-col" style={{ flex: "1 1 240px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#1E293B", marginBottom: "8px" }}>
                        Effective On <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#FFFFFF",
                          border: "1px solid #CBD5E1",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          height: "34px",
                          boxSizing: "border-box",
                        }}
                      >
                        <Calendar size={15} color="#94A3B8" />
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          style={{
                            border: "none",
                            outline: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#1E293B",
                            width: "100%",
                            background: "transparent",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom GST Row for Future Price */}
                <div
                  className="future-gst-row"
                  style={{
                    background: "#F8FBFE",
                    border: "1px solid rgba(219, 234, 254, 0.9)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#0F172A" }}>
                      {revisionType === "recurring" ? "GST on Recurring Price" : "GST on One-Time Price"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 500, color: "#334155" }}>
                        {revisionType === "recurring" ? "Apply GST on Recurring Price?" : "Apply GST on One-Time Price?"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setApplyGstOnFuture(!applyGstOnFuture)}
                        style={{
                          width: "44px",
                          height: "24px",
                          borderRadius: "9999px",
                          background: applyGstOnFuture ? "#22C55E" : "#CBD5E1",
                          border: "none",
                          padding: "2px",
                          cursor: "pointer",
                          position: "relative",
                          transition: "background 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "9999px",
                            background: "#FFFFFF",
                            boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
                            transform: applyGstOnFuture ? "translateX(20px)" : "translateX(0px)",
                            transition: "transform 0.2s ease",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Future GST fields & Future Total Price */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ width: "70px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "2px" }}>
                        CGST (%)
                      </label>
                      <input
                        type="text"
                        value={futureCgst}
                        placeholder="0.00"
                        disabled={!applyGstOnFuture}
                        onChange={(e) => setFutureCgst(filterDecimal(e.target.value))}
                        style={{
                          width: "100%",
                          height: "30px",
                          border: "1px solid #CBD5E1",
                          borderRadius: "8px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: applyGstOnFuture ? "#1E293B" : "#94A3B8",
                          background: applyGstOnFuture ? "#FFFFFF" : "#F8FAFC",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ width: "70px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "2px" }}>
                        SGST (%)
                      </label>
                      <input
                        type="text"
                        value={futureSgst}
                        placeholder="0.00"
                        disabled={!applyGstOnFuture}
                        onChange={(e) => setFutureSgst(filterDecimal(e.target.value))}
                        style={{
                          width: "100%",
                          height: "30px",
                          border: "1px solid #CBD5E1",
                          borderRadius: "8px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: applyGstOnFuture ? "#1E293B" : "#94A3B8",
                          background: applyGstOnFuture ? "#FFFFFF" : "#F8FAFC",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ width: "70px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "2px" }}>
                        IGST (%)
                      </label>
                      <input
                        type="text"
                        value={futureIgst}
                        placeholder="0.00"
                        disabled={!applyGstOnFuture}
                        onChange={(e) => setFutureIgst(filterDecimal(e.target.value))}
                        style={{
                          width: "100%",
                          height: "30px",
                          border: "1px solid #CBD5E1",
                          borderRadius: "8px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: applyGstOnFuture ? "#1E293B" : "#94A3B8",
                          background: applyGstOnFuture ? "#FFFFFF" : "#F8FAFC",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ minWidth: "120px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#0C233C", marginBottom: "2px" }}>
                        Total Price
                      </label>
                      <div
                        style={{
                          height: "30px",
                          background: "#E8F1FC",
                          border: "1px solid #BFDBFE",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#0C233C",
                        }}
                      >
                        ₹{calculatedFutureTotalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div
          className="add-edit-cat-modal-footer"
          style={{
            padding: "16px 32px",
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            background: "#FFFFFF",
          }}
        >
          <button
            type="button"
            className="add-edit-cat-cancel-btn"
            onClick={onClose}
            style={{
              height: "40px",
              padding: "0 24px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              background: "#FFFFFF",
              color: "#334155",
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="add-edit-cat-save-btn"
            onClick={handleSave}
            style={{
              height: "40px",
              padding: "0 32px",
              background: "#F4BC43",
              border: "none",
              borderRadius: "8px",
              color: "#0C233C",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
              transition: "transform 0.1s ease, filter 0.15s ease",
            }}
          >
            {isEdit ? "Save Changes" : "Add Category"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .modal-top-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .modal-top-left {
            flex: none !important;
            width: 100% !important;
            min-height: 0 !important;
          }
          .modal-cat-name-field {
            max-width: none !important;
          }
          .modal-preview-badge {
            width: 100% !important;
            min-width: 0 !important;
          }
          .modal-middle-grid {
            grid-template-columns: 1fr !important;
          }
          .revision-mode-row {
            grid-template-columns: 1fr !important;
          }
          .future-inputs-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .future-inc-by-col,
          .future-start-from-col,
          .future-repeat-col,
          .future-inc-by-onetime-col,
          .future-effective-onetime-col {
            flex: none !important;
            width: 100% !important;
            min-height: 0 !important;
          }
          .future-gst-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .divider-vert {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .add-edit-cat-modal-overlay {
            padding: 8px !important;
          }
          .add-edit-cat-modal-dialog {
            max-height: 95vh !important;
            border-radius: 12px !important;
            width: 100% !important;
          }
          .add-edit-cat-modal-header {
            padding: 16px 16px 12px !important;
          }
          .add-edit-cat-modal-header h2 {
            font-size: 17px !important;
            line-height: 24px !important;
          }
          .add-edit-cat-modal-body {
            padding: 14px 16px !important;
            gap: 14px !important;
          }
          .add-edit-cat-modal-footer {
            padding: 12px 16px !important;
          }
          .add-edit-cat-cancel-btn {
            height: 38px !important;
            padding: 0 16px !important;
            font-size: 13px !important;
          }
          .add-edit-cat-save-btn {
            height: 38px !important;
            padding: 0 20px !important;
            font-size: 13px !important;
          }
          .modal-top-left {
            gap: 14px !important;
            flex-wrap: nowrap !important;
            align-items: flex-start !important;
          }
          .pricing-gst-inputs-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .future-inputs-row {
            padding: 12px !important;
            gap: 12px !important;
          }
          .future-gst-row {
            padding: 12px !important;
            gap: 12px !important;
          }
        }
      `}</style>

      {/* Global Image Crop Modal in CIRCLE shape for Visitor Category */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={image}
        cropShape="round"
        aspect={1}
        title="Crop Visitor Category Picture"
        subtitle="Adjust position and zoom within the circular frame."
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={(croppedUrl) => {
          setImage(croppedUrl);
          setImageLink(croppedUrl);
          setIsCropModalOpen(false);
        }}
      />
    </div>
  );
}

export { EditVisitorCategoryModal as AddEditVisitorCategoryModal };
