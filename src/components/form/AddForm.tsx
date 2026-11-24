"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Upload,
  User,
  Search,
  Eye,
  EyeOff,
  Check,
  Calendar,
  Info,
  GripVertical,
  Maximize2,
  Loader2,
  Crop,
  Edit2,
} from "lucide-react";
import ImageCropModal from "@/components/modals/ImageCropModal";
import AssignReportAccessModal from "@/components/modals/AssignReportAccessModal";
import { AttractionItem } from "@/hooks/useManagerQueries";
import { SystemModule } from "@/hooks/useSystemModuleQueries";
import { AddManagerFormData } from "@/app/(dashboard)/manager-management/schema";

export interface AddFormProps {
  roleTitle?: "Manager" | "Staff";
  existingAttractions?: AttractionItem[];
  systemModules?: SystemModule[];
  onSave: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export type AddManagerFormProps = AddFormProps;

// Fixed & default modules that show as chips for Manager
const MANAGER_DEFAULT_MODULE_CHIPS = [
  "Staff Management",
  "Inventory Management",
  "Reports",
  "Booking Details",
  "Transaction Details",
];

// Fixed & default modules that show as chips for Staff
const STAFF_DEFAULT_MODULE_CHIPS = [
  "Ticket Scanning",
  "Reports",
];

export default function AddForm({
  roleTitle = "Manager",
  existingAttractions = [],
  systemModules = [],
  onSave,
  onCancel,
  isSaving = false,
}: AddFormProps) {
  // ── Form State (Card 1: Account Details)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Toggles — explicitly default to OFF per user instruction
  const [canGrantCrowdAccess, setCanGrantCrowdAccess] = useState(false);
  const [canGrantReportAccess, setCanGrantReportAccess] = useState(false);
  const [reportAccessType, setReportAccessType] = useState<"same" | "custom">("same");
  const [reportAccessDays, setReportAccessDays] = useState("0");

  // Staff-specific Report Access Timing Modal State
  const [isAssignReportModalOpen, setIsAssignReportModalOpen] = useState(false);
  const [staffReportTimingType, setStaffReportTimingType] = useState<"date_range" | "custom_timing">("custom_timing");
  const [staffReportStartDate, setStaffReportStartDate] = useState("");
  const [staffReportDays, setStaffReportDays] = useState(24);

  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  // ── Form State (Card 2: Employment & Compensation)
  const [salary, setSalary] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [dob, setDob] = useState("");

  const [pfContributionEnabled, setPfContributionEnabled] = useState(false);
  const [pfType, setPfType] = useState<"percentage" | "fixed">("percentage");
  const [pfValue, setPfValue] = useState("");

  const [incentivePlanEnabled, setIncentivePlanEnabled] = useState(false);
  const [incentiveType, setIncentiveType] = useState<"fixed" | "percentage" | "target">("fixed");
  const [incentiveAmount, setIncentiveAmount] = useState("");

  // ── Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Form State (Section 3: Attraction Management Permissions)
  const [selectedAttractionIds, setSelectedAttractionIds] = useState<string[]>([]);
  const [searchModuleQuery, setSearchModuleQuery] = useState("");

  // Mapping of attractionId -> { view: string[], edit: string[] }
  const [attractionModuleMap, setAttractionModuleMap] = useState<
    Record<string, { view: string[]; edit: string[] }>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Photo selection with JPG/PNG and 5 MB validation
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format validation: JPG or PNG only
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const validMimeTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (!validMimeTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setPhotoError("Only JPG or PNG images are allowed.");
      e.target.value = "";
      return;
    }

    // Size validation: max 5 MB
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > MAX_SIZE) {
      setPhotoError("Image size exceeds 5 MB limit. Please upload a smaller image.");
      e.target.value = "";
      return;
    }

    setPhotoError("");
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
  };

  // Build available module list directly from system modules in API response order
  const allAvailableModules = useMemo(() => {
    if (systemModules && systemModules.length > 0) {
      const seen = new Set<string>();
      const list: string[] = [];
      systemModules.forEach((sm) => {
        const isActive = String(sm.isActive).toUpperCase() === "ACTIVE" || (sm.isActive as unknown) === true;
        const name = sm.name?.trim();
        if (isActive && name && !seen.has(name)) {
          seen.add(name);
          list.push(name);
        }
      });
      if (list.length > 0) {
        return list;
      }
    }
    return roleTitle === "Staff" ? STAFF_DEFAULT_MODULE_CHIPS : MANAGER_DEFAULT_MODULE_CHIPS;
  }, [systemModules, roleTitle]);

  // Filtered available modules for the chips row
  const filteredModules = useMemo(() => {
    if (!searchModuleQuery.trim()) return allAvailableModules;
    const q = searchModuleQuery.toLowerCase();
    return allAvailableModules.filter((m) => m.toLowerCase().includes(q));
  }, [allAvailableModules, searchModuleQuery]);

  // Derived current view & edit modules for the selected attractions
  const currentViewModules = useMemo(() => {
    if (selectedAttractionIds.length === 0) return [];
    const firstId = selectedAttractionIds[0];
    return attractionModuleMap[firstId]?.view || [];
  }, [selectedAttractionIds, attractionModuleMap]);

  const currentEditModules = useMemo(() => {
    if (selectedAttractionIds.length === 0) return [];
    const firstId = selectedAttractionIds[0];
    return attractionModuleMap[firstId]?.edit || [];
  }, [selectedAttractionIds, attractionModuleMap]);

  // Check if a module chip is currently active in either View or View+Edit
  const isModuleActive = (modName: string) => {
    if (selectedAttractionIds.length === 0) return false;
    return currentViewModules.includes(modName) || currentEditModules.includes(modName);
  };

  // Toggle Attraction in Column 1
  const toggleAttraction = (id: string) => {
    setSelectedAttractionIds((prev) => {
      const isAlready = prev.includes(id);
      let updated: string[];
      if (isAlready) {
        updated = prev.filter((aId) => aId !== id);
      } else {
        updated = [...prev, id];
        // Initialize with empty submodules (no prefilled modules)
        if (!attractionModuleMap[id]) {
          setAttractionModuleMap((m) => ({
            ...m,
            [id]: {
              view: [],
              edit: [],
            },
          }));
        }
      }
      return updated;
    });
    if (errors.attractionPermissions) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.attractionPermissions;
        return next;
      });
    }
  };

  // Toggle Select All Attractions
  const toggleSelectAllAttractions = () => {
    if (selectedAttractionIds.length === existingAttractions.length) {
      setSelectedAttractionIds([]);
    } else {
      const allIds = existingAttractions.map((a) => a.id);
      setSelectedAttractionIds(allIds);
      // Ensure all have entries without prefilling any modules
      setAttractionModuleMap((prev) => {
        const next = { ...prev };
        allIds.forEach((id) => {
          if (!next[id]) {
            next[id] = {
              view: [],
              edit: [],
            };
          }
        });
        return next;
      });
    }
  };

  // Confirm Report Access Timing from Modal (for Staff)
  const handleConfirmReportTiming = (timing: {
    type: "date_range" | "custom_timing";
    startDate?: string;
    days?: number;
  }) => {
    setStaffReportTimingType(timing.type);
    if (timing.startDate) setStaffReportStartDate(timing.startDate);
    if (timing.days) setStaffReportDays(timing.days);

    // Ensure Reports is in view for all selected attractions
    if (selectedAttractionIds.length > 0) {
      setAttractionModuleMap((prev) => {
        const next = { ...prev };
        selectedAttractionIds.forEach((id) => {
          const entry = next[id] || { view: [], edit: [] };
          if (!entry.view.includes("Reports") && !entry.edit.includes("Reports")) {
            next[id] = {
              view: [...entry.view, "Reports"],
              edit: entry.edit,
            };
          }
        });
        return next;
      });
    }
  };

  // Toggle Module Chip in the Top Controls Bar
  const toggleModuleChip = (modName: string) => {
    if (selectedAttractionIds.length === 0) return;

    // For Staff, clicking Reports when inactive opens the Report Access Timing modal
    if (roleTitle === "Staff" && modName === "Reports") {
      const isActive = currentViewModules.includes("Reports") || currentEditModules.includes("Reports");
      if (!isActive) {
        setIsAssignReportModalOpen(true);
        return;
      }
    }

    setAttractionModuleMap((prev) => {
      const next = { ...prev };
      selectedAttractionIds.forEach((id) => {
        const entry = next[id] || { view: [], edit: [] };
        const inView = entry.view.includes(modName);
        const inEdit = entry.edit.includes(modName);

        if (inView || inEdit) {
          // Remove from both
          next[id] = {
            view: entry.view.filter((m) => m !== modName),
            edit: entry.edit.filter((m) => m !== modName),
          };
        } else {
          // Add to View
          next[id] = {
            view: [...entry.view, modName],
            edit: entry.edit,
          };
        }
      });
      return next;
    });
  };

  // Move module from View -> View + Edit
  const moveModuleToEdit = (modName: string) => {
    setAttractionModuleMap((prev) => {
      const next = { ...prev };
      selectedAttractionIds.forEach((id) => {
        const entry = next[id] || { view: [], edit: [] };
        next[id] = {
          view: entry.view.filter((m) => m !== modName),
          edit: entry.edit.includes(modName) ? entry.edit : [...entry.edit, modName],
        };
      });
      return next;
    });
  };

  // Move module from View + Edit -> View
  const moveModuleToView = (modName: string) => {
    setAttractionModuleMap((prev) => {
      const next = { ...prev };
      selectedAttractionIds.forEach((id) => {
        const entry = next[id] || { view: [], edit: [] };
        next[id] = {
          view: entry.view.includes(modName) ? entry.view : [...entry.view, modName],
          edit: entry.edit.filter((m) => m !== modName),
        };
      });
      return next;
    });
  };

  // Email validation helper
  const validateEmailValue = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) {
      return "Email address is required";
    }
    if (!trimmed.includes("@")) {
      return "Please include an '@' in the email address";
    }
    const [localPart, domainPart] = trimmed.split("@");
    if (!localPart) {
      return "Please enter a username before '@'";
    }
    if (!domainPart) {
      return "Please enter a domain after '@'";
    }
    if (!domainPart.includes(".")) {
      return "Please include a domain extension like .com";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  // Validate and Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.name = "Full name must be at least 2 characters";
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    const emailErr = validateEmailValue(email);
    if (emailErr) {
      newErrors.email = emailErr;
    }

    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (selectedAttractionIds.length === 0) {
      newErrors.attractionPermissions = `At least one attraction must be assigned to the ${roleTitle.toLowerCase()}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Build attraction permissions format expected by the API
    const attractionPermissions = selectedAttractionIds.map((id) => {
      const entry = attractionModuleMap[id] || { view: [], edit: [] };
      const combinedModules = Array.from(new Set([...entry.view, ...entry.edit]));
      const attrObj = existingAttractions.find((a) => a.id === id);
      return {
        attractionId: id,
        attractionName: attrObj?.name || id,
        modules: combinedModules,
      };
    });

    // Check if Reports module is selected in permissions
    const isReportsActive = selectedAttractionIds.some((id) => {
      const entry = attractionModuleMap[id];
      return entry?.view.includes("Reports") || entry?.edit.includes("Reports");
    });

    const payload = {
      name: fullName.trim(),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      password,
      status,
      allowedModules: [],
      attractionManagementEnabled: true,
      attractionPermissions,
      selectedAttractionIds,
      canViewReports: isReportsActive,
      reportAccessTiming: staffReportTimingType === "custom_timing" ? staffReportDays * 24 : 24,
      reportTimingType: staffReportTimingType,
      reportStartDate: staffReportStartDate,
      reportDays: staffReportDays,
      salary,
      joiningDate,
      dob,
      pfContribution: pfContributionEnabled ? { type: pfType, value: pfValue } : null,
      incentivePlan: incentivePlanEnabled ? { type: incentiveType, amount: incentiveAmount } : null,
      grantCrowdAccess: canGrantCrowdAccess,
    };

    await onSave(payload as any);
  };

  return (
    <div className="add-manager-wrapper">
      {/* ── Breadcrumb Navigation */}
      <button
        type="button"
        onClick={onCancel}
        className="add-manager-back-btn"
      >
        <ArrowLeft size={16} color="#1E293B" strokeWidth={2} />
        <span>Back to {roleTitle === "Staff" ? "Staff list" : "Managers"}</span>
      </button>

      <form noValidate onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ── Top Two Cards Section (Side by Side) */}
        <div className="top-two-cards-grid">
          {/* ── CARD 1: Manager / Staff Account Details */}
          <div className="form-card">
            <div className="form-card-header">
              <h2 className="form-card-title">{roleTitle} Account Details</h2>
            </div>

            <div className="form-card-body">
              {/* Photo Upload Area */}
              <div className="photo-upload-container">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div className="avatar-circle">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Avatar" className="avatar-img" />
                    ) : (
                      <User size={44} color="#94A3B8" />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="avatar-camera-btn"
                      title="Upload Avatar"
                    >
                      <Camera size={14} color="#64748B" />
                    </button>
                  </div>
                  {/* Circular Crop Button shown once photo is uploaded */}
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setIsCropModalOpen(true)}
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
                  )}
                </div>

                <div className="upload-controls">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handlePhotoSelect}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-upload-photo"
                  >
                    <Upload size={14} color="#475569" />
                    <span>Upload Photo</span>
                  </button>
                  <span className="photo-requirements">JPG or PNG, max 5 MB</span>
                  {photoError && (
                    <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 600 }}>
                      ⚠ {photoError}
                    </span>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div className="field-group">
                <label className="field-label">
                  Full Name <span className="field-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${roleTitle === "Staff" ? "staff" : "manager"} full name`}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`field-input ${errors.name ? "field-input-error" : ""}`}
                />
                {errors.name && <span className="field-error-text">⚠ {errors.name}</span>}
              </div>

              {/* Phone & Email (Side by Side) */}
              <div className="fields-two-col">
                <div className="field-group">
                  <label className="field-label">
                    Phone <span className="field-required">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhone(val);
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    className={`field-input ${errors.phone ? "field-input-error" : ""}`}
                  />
                  {errors.phone && <span className="field-error-text">⚠ {errors.phone}</span>}
                </div>

                <div className="field-group">
                  <label className="field-label">
                    Email <span className="field-required">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmail(val);
                      if (errors.email) {
                        const err = validateEmailValue(val);
                        setErrors((prev) => ({ ...prev, email: err }));
                      }
                    }}
                    onBlur={() => {
                      if (email.trim()) {
                        const err = validateEmailValue(email);
                        if (err) setErrors((prev) => ({ ...prev, email: err }));
                      }
                    }}
                    className={`field-input ${errors.email ? "field-input-error" : ""}`}
                  />
                  {errors.email && <span className="field-error-text">⚠ {errors.email}</span>}
                </div>
              </div>

              {/* Login Password */}
              <div className="field-group">
                <label className="field-label">
                  Login Password <span className="field-required">*</span>
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    className={`field-input ${errors.password ? "field-input-error" : ""}`}
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                  >
                    {showPassword ? <Eye size={16} color="#94A3B8" /> : <EyeOff size={16} color="#94A3B8" />}
                  </button>
                </div>
                <span className="field-helper-text">Minimum 6 characters</span>
                {errors.password && <span className="field-error-text">⚠ {errors.password}</span>}
              </div>

              {/* Grant Crowd Access (Default OFF per user instruction) */}
              <div className="toggle-permission-card">
                <span className="toggle-permission-label">
                  {roleTitle === "Staff" ? "Grant Crowd Access" : "Can Grant Crowd Access"}
                </span>
                <button
                  type="button"
                  onClick={() => setCanGrantCrowdAccess(!canGrantCrowdAccess)}
                  className={`switch-toggle ${canGrantCrowdAccess ? "switch-on" : "switch-off"}`}
                >
                  <span className="switch-handle" />
                </button>
              </div>

              {/* Can Grant Report Access (Only for Manager; for Staff, report access is assigned via module timing popup) */}
              {roleTitle === "Manager" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                  <div className="toggle-permission-card">
                    <span className="toggle-permission-label">Can Grant Report Access</span>
                    <button
                      type="button"
                      onClick={() => setCanGrantReportAccess(!canGrantReportAccess)}
                      className={`switch-toggle ${canGrantReportAccess ? "switch-on" : "switch-off"}`}
                    >
                      <span className="switch-handle" />
                    </button>
                  </div>

                  {/* Nested Report Access Configuration Box (when toggle is ON) */}
                  {canGrantReportAccess && (
                    <div className="nested-report-box">
                      <span className="nested-report-header">Report Access for Staff</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                        {/* Option 1: Same as My Access */}
                        <label
                          onClick={() => setReportAccessType("same")}
                          className={`radio-card ${reportAccessType === "same" ? "radio-card-active" : "radio-card-disabled"}`}
                        >
                          <div className={`radio-indicator ${reportAccessType === "same" ? "radio-checked" : ""}`}>
                            {reportAccessType === "same" && <div className="radio-dot" />}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="radio-card-title">Same as My Access</span>
                            <span className="radio-card-desc">Staff will receive the same report access duration.</span>
                          </div>
                        </label>

                        {/* Option 2: Custom Access */}
                        <label
                          onClick={() => setReportAccessType("custom")}
                          className={`radio-card ${reportAccessType === "custom" ? "radio-card-active" : "radio-card-disabled"}`}
                        >
                          <div className={`radio-indicator ${reportAccessType === "custom" ? "radio-checked" : ""}`}>
                            {reportAccessType === "custom" && <div className="radio-dot" />}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                            <span className="radio-card-title">Custom Access</span>
                            <span className="radio-card-desc">Can assign a different report access duration to staff.</span>
                            {reportAccessType === "custom" && (
                              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    border: "1px solid #CBD5E1",
                                    borderRadius: "6px",
                                    background: "#FFFFFF",
                                    padding: "4px 8px",
                                    width: "fit-content",
                                    gap: "8px",
                                  }}
                                >
                                  <input
                                    type="text"
                                    value={reportAccessDays}
                                    onChange={(e) => setReportAccessDays(e.target.value.replace(/\D/g, ""))}
                                    style={{
                                      width: "36px",
                                      border: "none",
                                      outline: "none",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "#1E293B",
                                    }}
                                  />
                                  <span
                                    style={{
                                      background: "#FEF3C7",
                                      color: "#D97706",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    Days
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Account Status */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "4px" }}>
                <label className="field-label">Account Status</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setStatus(status === "Active" ? "Inactive" : "Active")}
                    className={`switch-toggle ${status === "Active" ? "switch-on" : "switch-off"}`}
                  >
                    <span className="switch-handle" />
                  </button>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: status === "Active" ? "#10B981" : "#64748B",
                    }}
                  >
                    {status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Employment & Compensation Details */}
          <div className="form-card">
            <div className="form-card-header" style={{ justifyContent: "space-between" }}>
              <h2 className="form-card-title">Employment &amp; Compensation Details</h2>
              <span className="optional-badge">Optional</span>
            </div>

            <div className="form-card-body">
              {/* Salary */}
              <div className="field-group">
                <label className="field-label-sm">Salary (₹)</label>
                <input
                  type="text"
                  placeholder="Enter monthly salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value.replace(/\D/g, ""))}
                  className="field-input"
                />
              </div>

              {/* Joining Date & Date of Birth */}
              <div className="fields-two-col">
                <div className="field-group">
                  <label className="field-label-sm">Joining Date</label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={joiningDate ? "date" : "text"}
                      placeholder="Select joining date"
                      value={joiningDate}
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = "text";
                      }}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as any).showPicker?.();
                        } catch { }
                      }}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="field-input"
                      style={{ paddingRight: "36px" }}
                    />
                    <Calendar
                      size={16}
                      color="#94A3B8"
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label-sm">Date of Birth</label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={dob ? "date" : "text"}
                      placeholder="Select DOB"
                      value={dob}
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = "text";
                      }}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as any).showPicker?.();
                        } catch { }
                      }}
                      onChange={(e) => setDob(e.target.value)}
                      className="field-input"
                      style={{ paddingRight: "36px" }}
                    />
                    <Calendar
                      size={16}
                      color="#94A3B8"
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* PF Contribution (Default OFF) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <label className="field-label-sm">PF Contribution</label>
                  <button
                    type="button"
                    onClick={() => setPfContributionEnabled(!pfContributionEnabled)}
                    className={`switch-toggle ${pfContributionEnabled ? "switch-on" : "switch-off"}`}
                  >
                    <span className="switch-handle" />
                  </button>
                </div>

                {pfContributionEnabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    {/* Toggle Options: Percentage / Fixed */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <label
                        onClick={() => setPfType("percentage")}
                        className={`radio-card ${pfType === "percentage" ? "radio-card-active" : "radio-card-disabled"}`}
                        style={{ padding: "8px 12px" }}
                      >
                        <div className={`radio-indicator ${pfType === "percentage" ? "radio-checked" : ""}`}>
                          {pfType === "percentage" && <div className="radio-dot" />}
                        </div>
                        <span className="radio-card-title" style={{ fontSize: "12px" }}>Percentage (%)</span>
                      </label>

                      <label
                        onClick={() => setPfType("fixed")}
                        className={`radio-card ${pfType === "fixed" ? "radio-card-active" : "radio-card-disabled"}`}
                        style={{ padding: "8px 12px" }}
                      >
                        <div className={`radio-indicator ${pfType === "fixed" ? "radio-checked" : ""}`}>
                          {pfType === "fixed" && <div className="radio-dot" />}
                        </div>
                        <span className="radio-card-title" style={{ fontSize: "12px" }}>Fixed Amount (₹)</span>
                      </label>
                    </div>

                    <div style={{ position: "relative", width: "100%" }}>
                      <input
                        type="text"
                        placeholder={pfType === "percentage" ? "Enter percentage" : "Enter fixed amount"}
                        value={pfValue}
                        onChange={(e) => setPfValue(e.target.value.replace(/\D/g, ""))}
                        className="field-input"
                        style={{ paddingRight: "30px" }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "13px",
                          color: "#94A3B8",
                          fontWeight: 600,
                        }}
                      >
                        {pfType === "percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Incentive Plan (Default OFF) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <label className="field-label-sm">Incentive Plan</label>
                  <button
                    type="button"
                    onClick={() => setIncentivePlanEnabled(!incentivePlanEnabled)}
                    className={`switch-toggle ${incentivePlanEnabled ? "switch-on" : "switch-off"}`}
                  >
                    <span className="switch-handle" />
                  </button>
                </div>

                {incentivePlanEnabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      <label
                        onClick={() => setIncentiveType("fixed")}
                        className={`radio-card ${incentiveType === "fixed" ? "radio-card-active" : "radio-card-disabled"}`}
                        style={{ padding: "8px 8px" }}
                      >
                        <div className={`radio-indicator ${incentiveType === "fixed" ? "radio-checked" : ""}`}>
                          {incentiveType === "fixed" && <div className="radio-dot" />}
                        </div>
                        <span className="radio-card-title" style={{ fontSize: "11px" }}>Fixed Amount (₹)</span>
                      </label>

                      <label
                        onClick={() => setIncentiveType("percentage")}
                        className={`radio-card ${incentiveType === "percentage" ? "radio-card-active" : "radio-card-disabled"}`}
                        style={{ padding: "8px 8px" }}
                      >
                        <div className={`radio-indicator ${incentiveType === "percentage" ? "radio-checked" : ""}`}>
                          {incentiveType === "percentage" && <div className="radio-dot" />}
                        </div>
                        <span className="radio-card-title" style={{ fontSize: "11px" }}>Percentage (%)</span>
                      </label>

                      <label
                        onClick={() => setIncentiveType("target")}
                        className={`radio-card ${incentiveType === "target" ? "radio-card-active" : "radio-card-disabled"}`}
                        style={{ padding: "8px 8px" }}
                      >
                        <div className={`radio-indicator ${incentiveType === "target" ? "radio-checked" : ""}`}>
                          {incentiveType === "target" && <div className="radio-dot" />}
                        </div>
                        <span className="radio-card-title" style={{ fontSize: "11px" }}>Target-Based</span>
                      </label>
                    </div>

                    <div className="field-group" style={{ marginTop: "4px" }}>
                      <label className="field-label-sm">Incentive Amount</label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "13px",
                            color: "#94A3B8",
                            fontWeight: 600,
                          }}
                        >
                          ₹
                        </span>
                        <input
                          type="text"
                          placeholder="Enter amount"
                          value={incentiveAmount}
                          onChange={(e) => setIncentiveAmount(e.target.value.replace(/\D/g, ""))}
                          className="field-input"
                          style={{ paddingLeft: "28px" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: Attraction Management Permissions */}
        <div className="permissions-card">
          <div className="permissions-card-header">
            <h2 className="form-card-title">Attraction Management Permissions</h2>
          </div>

          <div className="permissions-card-body">
            {/* Top Controls Bar */}
            <div className="controls-bar">
              <div className="controls-bar-left">
                <span className="controls-bar-label">Available Modules for:</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  {selectedAttractionIds.slice(0, 3).map((aId) => {
                    const attr = existingAttractions.find((a) => a.id === aId);
                    return (
                      <span key={aId} className="attraction-pill-tag">
                        {attr?.name || aId}
                      </span>
                    );
                  })}
                  {selectedAttractionIds.length > 3 && (
                    <span className="attraction-pill-tag" style={{ background: "#E2E8F0", color: "#475569" }}>
                      +{selectedAttractionIds.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Search Modules Input */}
              <div className="search-modules-input-wrap">
                <Search size={16} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchModuleQuery}
                  onChange={(e) => setSearchModuleQuery(e.target.value)}
                  className="search-modules-input"
                />
              </div>
            </div>

            {/* Available Module Chips Row */}
            <div className="module-chips-row">
              {filteredModules.map((modName) => {
                const isChipsDisabled = selectedAttractionIds.length === 0;
                const active = !isChipsDisabled && isModuleActive(modName);
                return (
                  <button
                    key={modName}
                    type="button"
                    disabled={isChipsDisabled}
                    onClick={() => toggleModuleChip(modName)}
                    className={`module-chip ${
                      isChipsDisabled
                        ? "module-chip-disabled"
                        : active
                        ? "module-chip-active"
                        : "module-chip-inactive"
                    }`}
                  >
                    <div
                      className={`chip-checkbox ${
                        isChipsDisabled
                          ? "chip-checkbox-disabled"
                          : active
                          ? "chip-checkbox-active"
                          : ""
                      }`}
                    >
                      {active && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                    <span>{modName}</span>
                  </button>
                );
              })}
            </div>

            {errors.attractionPermissions && (
              <div style={{ padding: "8px 12px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", fontSize: "12px", fontWeight: 600 }}>
                ⚠ {errors.attractionPermissions}
              </div>
            )}

            {/* ── 3-Column Permissions Container */}
            <div className="permissions-columns-grid">
              {/* ── COLUMN 1: Attractions List */}
              <div className="permission-column">
                <div className="column-header-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h3 className="column-title">Attractions</h3>
                    <Info size={14} color="#94A3B8" />
                  </div>
                </div>

                {/* Select All Checkbox */}
                <label className="checkbox-row-all">
                  <input
                    type="checkbox"
                    checked={
                      existingAttractions.length > 0 &&
                      selectedAttractionIds.length === existingAttractions.length
                    }
                    onChange={toggleSelectAllAttractions}
                    style={{ width: "16px", height: "16px", accentColor: "#2563EB", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>Select All</span>
                </label>

                {/* Scrollable Attractions List */}
                <div className="column-scroll-list">
                  {existingAttractions.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                      No attractions found.
                    </div>
                  ) : (
                    existingAttractions.map((attr) => {
                      const isChecked = selectedAttractionIds.includes(attr.id);
                      return (
                        <div
                          key={attr.id}
                          onClick={() => toggleAttraction(attr.id)}
                          className={`attraction-item-card ${isChecked ? "attraction-item-card-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // handled by parent div
                            style={{ width: "16px", height: "16px", accentColor: "#2563EB", cursor: "pointer", flexShrink: 0 }}
                          />
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="attraction-item-title">{attr.name}</span>
                            {attr.category && (
                              <span className="attraction-item-category">
                                {typeof attr.category === "string" ? attr.category : (attr as any).category?.name || "Attraction"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── COLUMN 2: View (Read-Only) */}
              <div className="permission-column">
                <div className="column-header-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h3 className="column-title">View</h3>
                    <Info size={14} color="#94A3B8" />
                  </div>
                  <span className="column-count-badge">
                    {currentViewModules.length} {currentViewModules.length === 1 ? "Module" : "Modules"}
                  </span>
                </div>

                <p className="column-subtitle">Modules the {roleTitle.toLowerCase()} can only view (read-only).</p>

                <div className="column-modules-container">
                  {currentViewModules.length === 0 ? (
                    <div className="column-empty-state">
                      <div className="empty-icon-wrap">
                        <Maximize2 size={22} color="#3B82F6" />
                      </div>
                      <h4 className="empty-title">No modules added yet</h4>
                      <p className="empty-desc">Items you assign to this section will appear here.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                      {currentViewModules.map((modName) => (
                        <div key={modName} className="module-item-card">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <GripVertical size={16} color="#94A3B8" style={{ cursor: "grab" }} />
                            <span className="module-item-title">{modName}</span>
                            {modName === "Reports" && roleTitle === "Staff" ? (
                              <button
                                type="button"
                                onClick={() => setIsAssignReportModalOpen(true)}
                                title="Edit Report Access Timing"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "2px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  color: "#64748B",
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                            ) : (
                              <Info size={14} color="#94A3B8" />
                            )}
                          </div>
                          <button
                            type="button"
                            title="Move to View + Edit"
                            onClick={() => moveModuleToEdit(modName)}
                            className="btn-move-arrow"
                          >
                            <ArrowRight size={14} color="#475569" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── COLUMN 3: View + Edit */}
              <div className="permission-column">
                <div className="column-header-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h3 className="column-title">View + Edit</h3>
                    <Info size={14} color="#94A3B8" />
                  </div>
                  <span className="column-count-badge">
                    {currentEditModules.length} {currentEditModules.length === 1 ? "Module" : "Modules"}
                  </span>
                </div>

                <p className="column-subtitle">Modules the {roleTitle.toLowerCase()} can view and make changes to.</p>

                <div className="column-modules-container">
                  {currentEditModules.length === 0 ? (
                    <div className="column-empty-state">
                      <div className="empty-icon-wrap">
                        <Maximize2 size={22} color="#3B82F6" />
                      </div>
                      <h4 className="empty-title">No modules added yet</h4>
                      <p className="empty-desc">Move modules here from &ldquo;View&rdquo; to give view and edit access.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                      {currentEditModules.map((modName) => (
                        <div key={modName} className="module-item-card">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <GripVertical size={16} color="#94A3B8" style={{ cursor: "grab" }} />
                            <span className="module-item-title">{modName}</span>
                            <Info size={14} color="#94A3B8" />
                          </div>
                          <button
                            type="button"
                            title="Move back to View"
                            onClick={() => moveModuleToView(modName)}
                            className="btn-move-arrow"
                          >
                            <ArrowLeft size={14} color="#475569" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Page Footer Action Buttons */}
        <div className="form-action-footer">
          <button
            type="button"
            onClick={onCancel}
            className="btn-form-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-form-create"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span>Creating {roleTitle}...</span>
              </>
            ) : (
              <span>Create {roleTitle}</span>
            )}
          </button>
        </div>
      </form>

      {/* Embedded Styles Matching Figma Specs */}
      <style>{`
        .add-manager-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
          min-height: 100%;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-sizing: border-box;
          padding: 0;
        }

        .add-manager-back-btn {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          line-height: 20px;
          color: #1E293B;
          padding: 0px 0px 6px;
          transition: opacity 0.15s ease;
        }
        .add-manager-back-btn:hover {
          opacity: 0.75;
        }

        .top-two-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .form-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 28px;
          background: #FFFFFF;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          width: 100%;
        }

        .form-card-header {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0px 0px 20px;
          width: 100%;
          border-bottom: 1px solid #F1F5F9;
        }

        .form-card-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 18px;
          line-height: 24px;
          color: #1E293B;
          margin: 0;
        }

        .optional-badge {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 11px;
          line-height: 16px;
          color: #3B82F6;
          background: #EFF6FF;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #DBEAFE;
        }

        .form-card-body {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 24px;
          gap: 20px;
          width: 100%;
        }

        .photo-upload-container {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 20px;
          width: 100%;
        }

        .avatar-circle {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          border: 2px solid #E2E8F0;
          flex-shrink: 0;
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-camera-btn {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.15s ease;
        }
        .avatar-camera-btn:hover {
          background: #F8FAFC;
          transform: scale(1.05);
        }

        .upload-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .btn-upload-photo {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-upload-photo:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .photo-requirements {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          line-height: 16px;
          color: #94A3B8;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          width: 100%;
        }

        .field-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          line-height: 18px;
          color: #1E293B;
        }

        .field-label-sm {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 16px;
          color: #1E293B;
        }

        .field-required {
          color: #EF4444;
        }

        .field-input {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          height: 44px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          color: #1E293B;
          outline: none;
          transition: all 0.15s ease;
        }
        .field-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          cursor: pointer;
          position: absolute;
          right: 0;
          top: 0;
          width: 36px;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        .field-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .field-input::placeholder {
          color: #94A3B8;
        }
        .field-input-error {
          border-color: #EF4444 !important;
          background-color: #FFFDFD !important;
        }

        .fields-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .field-helper-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          line-height: 16px;
          color: #94A3B8;
        }

        .field-error-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          line-height: 14px;
          color: #EF4444;
          font-weight: 600;
        }

        .toggle-permission-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          width: 100%;
        }

        .toggle-permission-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          line-height: 18px;
          color: #1E293B;
        }

        .switch-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease;
          padding: 2px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
        }
        .switch-on {
          background-color: #10B981;
        }
        .switch-off {
          background-color: #CBD5E1;
        }
        .switch-handle {
          display: inline-block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        .switch-on .switch-handle {
          transform: translateX(20px);
        }
        .switch-off .switch-handle {
          transform: translateX(0px);
        }

        .nested-report-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          width: 100%;
          box-sizing: border-box;
        }

        .nested-report-header {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #64748B;
        }

        .radio-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }
        .radio-card:hover {
          border-color: #CBD5E1;
        }
        .radio-card-active {
          border-color: #3B82F6;
          background: #EFF6FF;
        }
        .radio-card-disabled {
          background: #F8FAFC;
          border-color: #E2E8F0;
          opacity: 0.55;
          cursor: pointer;
        }
        .radio-card-disabled:hover {
          opacity: 0.85;
          border-color: #CBD5E1;
          background: #F1F5F9;
        }
        .radio-card-disabled .radio-card-title {
          color: #64748B;
        }
        .radio-card-disabled .radio-card-desc {
          color: #94A3B8;
        }

        .radio-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1.5px solid #CBD5E1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .radio-checked {
          border-color: #3B82F6;
        }
        .radio-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3B82F6;
        }

        .radio-card-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: #1E293B;
        }

        .radio-card-desc {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: #64748B;
        }

        .permissions-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 28px;
          background: #FFFFFF;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          width: 100%;
        }

        .permissions-card-header {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0px 0px 20px;
          width: 100%;
        }

        .permissions-card-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          width: 100%;
          box-sizing: border-box;
          flex-wrap: wrap;
        }

        .controls-bar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .controls-bar-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #1E293B;
        }

        .attraction-pill-tag {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 12px;
          color: #2563EB;
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          padding: 3px 10px;
          border-radius: 16px;
        }

        .search-modules-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          width: 240px;
        }

        .search-modules-input {
          border: none;
          outline: none;
          background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: #1E293B;
          width: 100%;
        }
        .search-modules-input::placeholder {
          color: #94A3B8;
        }

        .module-chips-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          width: 100%;
        }

        .module-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .module-chip-inactive {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #475569;
        }
        .module-chip-inactive:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }
        .module-chip-active {
          background: #EFF6FF;
          border: 1.5px solid #2563EB;
          color: #1D4ED8;
        }
        .module-chip-disabled {
          background: #F8FAFC !important;
          border: 1px solid #E2E8F0 !important;
          color: #94A3B8 !important;
          opacity: 0.55 !important;
          cursor: not-allowed !important;
        }

        .chip-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid #CBD5E1;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .chip-checkbox-active {
          background: #2563EB;
          border-color: #2563EB;
        }
        .chip-checkbox-disabled {
          border-color: #CBD5E1 !important;
          background: #F1F5F9 !important;
        }

        .permissions-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .permission-column {
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          box-sizing: border-box;
          min-height: 480px;
        }

        .column-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
        }

        .column-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #1E293B;
          margin: 0;
        }

        .column-subtitle {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          line-height: 16px;
          color: #64748B;
          margin: 0 0 12px 0;
        }

        .column-count-badge {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 11px;
          color: #2563EB;
          background: #EFF6FF;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #DBEAFE;
        }

        .checkbox-row-all {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 4px 10px;
          border-bottom: 1px solid #F1F5F9;
          margin-bottom: 10px;
          cursor: pointer;
        }

        .column-scroll-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          max-height: 400px;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #CBD5E1 #F1F5F9;
        }

        .column-scroll-list::-webkit-scrollbar {
          width: 5px;
        }
        .column-scroll-list::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .column-scroll-list::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .column-scroll-list::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }

        .attraction-item-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .attraction-item-card:hover {
          border-color: #CBD5E1;
          background: #F8FAFC;
        }
        .attraction-item-card-selected {
          border: 1.5px solid #2563EB;
          background: #EFF6FF;
        }

        .attraction-item-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #1E293B;
        }

        .attraction-item-category {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 11px;
          color: #F59E0B;
        }

        .column-modules-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
          scrollbar-width: thin;
          scrollbar-color: #CBD5E1 #F1F5F9;
        }

        .column-modules-container::-webkit-scrollbar {
          width: 5px;
        }
        .column-modules-container::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .column-modules-container::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .column-modules-container::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }

        .column-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px 20px;
          border: 1.5px dashed #E2E8F0;
          border-radius: 8px;
          margin-top: 4px;
        }

        .empty-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #EFF6FF;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .empty-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #1E293B;
          margin: 0 0 4px 0;
        }

        .empty-desc {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          line-height: 16px;
          color: #94A3B8;
          margin: 0;
          max-width: 200px;
        }

        .module-item-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          background: #FFFFFF;
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.04);
        }

        .module-item-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: #1E293B;
        }

        .btn-move-arrow {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-move-arrow:hover {
          background: #E2E8F0;
        }

        .form-action-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0px;
          width: 100%;
        }

        .btn-form-cancel {
          padding: 10px 24px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          color: #1E293B;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-form-cancel:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .btn-form-create {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 28px;
          background: #F59E0B;
          border: none;
          border-radius: 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #1E293B;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
          transition: all 0.15s ease;
        }
        .btn-form-create:hover {
          background: #D97706;
          color: #FFFFFF;
        }
        .btn-form-create:disabled {
          background: #CBD5E1;
          color: #94A3B8;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ── Responsive rules ── */
        @media (max-width: 900px) {
          .top-two-cards-grid {
            grid-template-columns: 1fr;
          }
          .permissions-columns-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .add-manager-wrapper {
            padding: 0 !important;
          }
          .form-card, .permissions-card {
            padding: 16px;
            border-radius: 12px;
          }
          .fields-two-col {
            grid-template-columns: 1fr;
          }
          .controls-bar {
            flex-direction: column;
            align-items: flex-start;
          }
          .search-modules-input-wrap {
            width: 100%;
          }
        }
      `}</style>

      {/* Global Image Crop Modal in CIRCLE shape for Manager / Staff */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={photoUrl}
        cropShape="circle"
        aspect={1}
        title={`Crop ${roleTitle} Picture`}
        subtitle="Adjust position and zoom within the circular frame."
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={(croppedDataUrl: string) => {
          setPhotoUrl(croppedDataUrl);
          setIsCropModalOpen(false);
        }}
      />

      {/* Assign Report Access Timing Modal for Staff */}
      <AssignReportAccessModal
        isOpen={isAssignReportModalOpen}
        onClose={() => setIsAssignReportModalOpen(false)}
        initialType={staffReportTimingType}
        initialStartDate={staffReportStartDate}
        initialDays={staffReportDays}
        onConfirm={handleConfirmReportTiming}
      />
    </div>
  );
}
