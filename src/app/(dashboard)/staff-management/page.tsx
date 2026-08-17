"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Building,
  Ticket,
  Eye,
  ArrowLeft,
  Filter,
  X,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { INITIAL_STAFF, StaffUser } from "./types";
import { INITIAL_ATTRACTIONS, Attraction } from "@/app/(dashboard)/attraction-management/types";
import { DataTable, Column } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/Toast";
import { confirmAdd, confirmDelete, confirmStatusChange } from "@/lib/notify";
import { filterAttractionsByRole } from "@/lib/managerAuth";
import { staffSchema } from "./schema";
import { META_CONSTANTS } from "@/lib/metaConstant";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusToggle from "@/components/ui/StatusToggle";
import StatusFilterSelect from "@/components/ui/StatusFilterSelect";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import { matchesStatusFilter } from "@/lib/filterUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { handleDownloadStaffListPDF, handleExportStaffCSV } from "@/lib/printUtils";
import ExportButtons from "@/components/ui/ExportButtons";

const MultiSelect = MultiSelectDropdown;

function StaffManagementInner() {
  const { showToast } = useToast();

  const searchParams = useSearchParams();
  const { role: userRole } = useUserRole();
  const [staffList, setStaffList] = useState<StaffUser[]>(INITIAL_STAFF);
  const [attractions, setAttractions] = useState<Attraction[]>(INITIAL_ATTRACTIONS);
  const [search, setSearch] = useState("");
  const [selectedAttractionFilter, setSelectedAttractionFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(
    searchParams.get("status") ?? "All"
  );

  useEffect(() => {
    document.title = META_CONSTANTS.staffManagement.fullTitle;
    const scoped = filterAttractionsByRole(INITIAL_ATTRACTIONS, userRole);
    setAttractions(scoped);
    if (scoped.length > 0) {
      setFormData((prev) => ({ ...prev, assignedAttraction: [scoped[0].name] }));
    }
  }, [userRole]);

  // Modal & Selection States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: [] as string[],
    assignedAttraction: [] as string[],
    status: "Active" as StaffUser["status"],
  });

  // Validation errors from Zod
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: [],
      assignedAttraction: [],
      status: "Active",
    });
    setFormErrors({});
  };

  // Filtered List
  const filtered = staffList.filter((s) => {
    const managerAssignedNames =
      userRole === "Manager" ? attractions.map((a) => a.name.toLowerCase()) : null;
    const isAllowedForManager =
      !managerAssignedNames ||
      managerAssignedNames.some((n) => s.assignedAttraction.some((a) => a.toLowerCase() === n));

    const matchesAttraction = selectedAttractionFilter === "All" || s.assignedAttraction.includes(selectedAttractionFilter);
    const matchesStatus = matchesStatusFilter(s.status, selectedStatusFilter);
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.assignedAttraction.some((a) => a.toLowerCase().includes(search.toLowerCase())) ||
      s.role.some((r) => r.toLowerCase().includes(search.toLowerCase())) ||
      s.status.toLowerCase().includes(search.toLowerCase());
    return isAllowedForManager && matchesAttraction && matchesStatus && matchesSearch;
  });

  // Handlers
  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: [...staff.role],
      assignedAttraction: [...staff.assignedAttraction],
      status: staff.status,
    });
    setIsEditing(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation
    const result = staffSchema.safeParse(formData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        errs[field] = issue.message;
      });
      setFormErrors(errs);
      return;
    }
    setFormErrors({});
    setIsAddModalOpen(false);

    const confirmed = await confirmAdd(`staff member "${formData.name}"`);
    if (!confirmed) {
      setIsAddModalOpen(true);
      return;
    }

    const newStaff: StaffUser = {
      id: `STF-${Date.now().toString().slice(-3)}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      assignedAttraction: formData.assignedAttraction,
      joinedDate: new Date().toISOString().slice(0, 10),
      status: formData.status,
      ticketsIssued: 0,
    };

    setStaffList((prev) => [newStaff, ...prev]);
    resetForm();
    showToast(`Staff member "${newStaff.name}" added successfully!`, "success");
  };

  const handleSaveEdit = async () => {
    if (!selectedStaff) return;

    // Zod validation
    const result = staffSchema.safeParse(formData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        errs[field] = issue.message;
      });
      setFormErrors(errs);
      return;
    }
    setFormErrors({});

    const updated: StaffUser = {
      ...selectedStaff,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      assignedAttraction: formData.assignedAttraction,
      status: formData.status,
    };

    setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStaff(updated);
    setIsEditing(false);
    showToast(`Staff member "${updated.name}" updated successfully!`, "success");
  };

  const handleDeleteStaff = async (id: string) => {
    const target = staffList.find((s) => s.id === id);
    const prev = selectedStaff;
    setSelectedStaff(null);

    const confirmed = await confirmDelete(`staff member "${target?.name ?? id}"`);
    if (!confirmed) {
      setSelectedStaff(prev);
      return;
    }

    setStaffList((prev) => prev.filter((s) => s.id !== id));
    showToast(`Staff member "${target?.name ?? id}" has been deleted.`, "info");
  };

  const handleStatusToggle = async (staff: StaffUser, newStatus: StaffUser["status"]) => {
    const confirmed = await confirmStatusChange(staff.name, newStatus);
    if (!confirmed) return;

    const updated = { ...staff, status: newStatus };
    setStaffList((prev) => prev.map((s) => (s.id === staff.id ? updated : s)));
    if (selectedStaff?.id === staff.id) {
      setSelectedStaff(updated);
    }
    showToast(`Status of "${staff.name}" updated to "${newStatus}".`, "success");
  };

  // Export Handlers
  const handleExportPDF = () => {
    if (filtered.length === 0) {
      showToast("No staff data matches current filters", "info");
      return;
    }
    const parts: string[] = [];
    if (selectedAttractionFilter !== "All") parts.push(`Attraction: ${selectedAttractionFilter}`);
    if (selectedStatusFilter !== "All") parts.push(`Status: ${selectedStatusFilter}`);
    if (search) parts.push(`Search: "${search}"`);
    const filterInfo = parts.length > 0 ? parts.join(" | ") : "All Staff";
    handleDownloadStaffListPDF(filtered, filterInfo);
    showToast(`Generated PDF report for ${filtered.length} staff members`, "success");
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      showToast("No staff data matches current filters", "info");
      return;
    }
    const label = selectedAttractionFilter !== "All" ? selectedAttractionFilter : "All";
    handleExportStaffCSV(filtered, label);
    showToast(`Exported ${filtered.length} staff members to CSV`, "success");
  };

  // DataTable Columns
  const handleRowClick = (s: StaffUser) => {
    setSelectedStaff(s);
    setFormData({
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: [...s.role],
      assignedAttraction: [...s.assignedAttraction],
      status: s.status,
    });
    setIsEditing(false);
  };

  const columns: Column<StaffUser>[] = [
    {
      header: "Staff Member",
      cell: (s) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#0C2A42",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {s.name.charAt(0)}
          </div>
          <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: "14px" }}>
            {s.name}
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (s) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {s.role.map((r) => (
            <span
              key={r}
              style={{
                background: "rgba(35,114,165,0.08)",
                color: colors.brand.accent,
                padding: "3px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                whiteSpace: "nowrap",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Attraction",
      cell: (s) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {s.assignedAttraction.map((a) => (
            <span
              key={a}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(35,114,165,0.06)",
                color: "#2372A5",
                padding: "3px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                whiteSpace: "nowrap",
              }}
            >
              <Building size={11} />
              {a}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      header: "Action",
      align: "right",
      cell: (s) => (
        <button
          onClick={() => handleRowClick(s)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(35,114,165,0.1)", color: colors.brand.accent,
            border: `1px solid ${colors.brand.accent}`, borderRadius: "6px",
            padding: "6px 12px", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", fontFamily: typography.fontFamily.sans,
          }}
        >
          <Eye size={15} /><span>View</span>
        </button>
      ),
    },
  ];


  // ─── Detail / Edit View ──────────────────────────────────────────────────
  if (selectedStaff) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            background: "#FFFFFF",
            padding: "18px 24px",
            borderRadius: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => {
                setSelectedStaff(null);
                setIsEditing(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: colors.bg.page,
                color: colors.text.primary,
                border: `1px solid ${colors.header.border}`,
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Staff List</span>
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "20px",
                    color: colors.text.primary,
                    margin: 0,
                  }}
                >
                  {selectedStaff.name}
                </h1>
                <span
                  style={{
                    background: "rgba(35,114,165,0.1)",
                    color: colors.brand.accent,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {selectedStaff.id}
                </span>
                <span
                  style={{
                    background: selectedStaff.status === "Active" ? "#F0FDF4" : "#FEF2F2",
                    color: selectedStaff.status === "Active" ? colors.status.success : colors.status.error,
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {selectedStaff.status}
                </span>
              </div>
              <p
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  color: colors.text.muted,
                  margin: "2px 0 0",
                }}
              >
                Assigned Attractions: <strong>{selectedStaff.assignedAttraction.join(", ")}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.login.inputBorder}`,
                    background: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: colors.brand.primary,
                    color: colors.sidebar.activeText,
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily.sans,
                    boxShadow: "0 4px 12px rgba(244,188,67,0.3)",
                  }}
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: colors.brand.accent,
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  <Edit2 size={16} />
                  <span>Edit Staff Member</span>
                </button>
                <button
                  onClick={() => handleDeleteStaff(selectedStaff.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "#FEF2F2",
                    color: colors.status.error,
                    border: `1px solid ${colors.status.error}`,
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Staff</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form or Detail Card */}
        {isEditing ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                margin: 0,
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                color: colors.text.primary,
              }}
            >
              Edit Staff Member Information
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors((p) => ({ ...p, name: "" })); }}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: `1.5px solid ${formErrors.name ? "#EF4444" : "#CBD5E1"}`,
                    padding: "0 12px",
                    marginTop: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                {formErrors.name && <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>{formErrors.name}</span>}
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFormErrors((p) => ({ ...p, email: "" })); }}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: `1.5px solid ${formErrors.email ? "#EF4444" : "#CBD5E1"}`,
                    padding: "0 12px",
                    marginTop: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                {formErrors.email && <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>{formErrors.email}</span>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <MultiSelect
                label="Assigned Attraction"
                required
                options={attractions.map((a) => a.name)}
                selected={formData.assignedAttraction}
                onChange={(vals) => { setFormData({ ...formData, assignedAttraction: vals }); setFormErrors((p) => ({ ...p, assignedAttraction: "" })); }}
                error={formErrors.assignedAttraction}
              />
              <MultiSelect
                label="Staff Role"
                required
                options={["Counter Operator", "Validator", "Helpdesk", "Supervisor"]}
                selected={formData.role}
                onChange={(vals) => { setFormData({ ...formData, role: vals }); setFormErrors((p) => ({ ...p, role: "" })); }}
                error={formErrors.role}
              />
            </div>

            {/* Status Toggle — Edit Form */}
            <StatusToggle
              value={formData.status}
              onChange={(status) => setFormData({ ...formData, status })}
              error={formErrors.status}
            />
          </div>
        ) : (
          // ── Read-Only Detail Cards ────────────────────────────────────────
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Row 1: Personal Info + Status/Tickets */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Personal Info */}
              <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: typography.fontFamily.sans }}>
                  Personal Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#0C2A42", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "18px", flexShrink: 0 }}>
                      {selectedStaff.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "16px", color: "#011B2F" }}>{selectedStaff.name}</div>
                      <div style={{ fontSize: "12px", color: colors.text.muted }}>{selectedStaff.id}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "8px", borderTop: "1px solid #F1F5F9" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Email</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>{selectedStaff.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Phone</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>{selectedStaff.phone}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Joined Date</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>{selectedStaff.joinedDate}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Role</div>
                      <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {selectedStaff.role.map((r) => (
                          <span key={r} style={{ background: "rgba(35,114,165,0.1)", color: colors.brand.accent, padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance & Status */}
              <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: typography.fontFamily.sans }}>
                  Performance & Account Status
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Tickets stat */}
                  <div style={{ background: "rgba(35,114,165,0.05)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase" }}>Total Tickets Processed</div>
                      <div style={{ fontSize: "28px", fontWeight: 800, color: "#0C2A42", fontFamily: typography.fontFamily.sans, marginTop: "4px" }}>
                        {selectedStaff.ticketsIssued.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: colors.brand.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Ticket size={24} color="#0C2A42" />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Account Status</div>
                    <StatusToggle
                      value={selectedStaff.status}
                      onChange={(st) => handleStatusToggle(selectedStaff, st)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Attraction Assignment */}
            <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: typography.fontFamily.sans }}>
                Attraction Assignment
              </h3>
              <div>
                <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Assigned Attraction</div>
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedStaff.assignedAttraction.map((a) => (
                    <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#0F172A", padding: "6px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700 }}>
                      <Building size={14} color="#2372A5" />
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Staff List View 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />

        <button
          onClick={handleOpenAddModal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: colors.brand.primary,
            color: colors.sidebar.activeText,
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontFamily: typography.fontFamily.sans,
            fontWeight: typography.fontWeight.bold,
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
          }}
        >
          <Plus size={18} />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "14px 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Attraction Filter Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color={colors.brand.accent} />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: colors.text.muted,
              fontFamily: typography.fontFamily.sans,
            }}
          >
            Filter:
          </span>
          <select
            value={selectedAttractionFilter}
            onChange={(e) => setSelectedAttractionFilter(e.target.value)}
            style={{
              height: "38px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              padding: "0 12px",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              fontWeight: 600,
              color: colors.brand.accent,
              outline: "none",
              cursor: "pointer",
              background: "#FFFFFF",
            }}
          >
            <option value="All">All Attractions</option>
            {attractions.map((att) => (
              <option key={att.id} value={att.name}>
                {att.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <StatusFilterSelect
            value={selectedStatusFilter}
            onChange={(val) => setSelectedStatusFilter(val)}
          />
        </div>

        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: colors.bg.page,
            padding: "8px 14px",
            borderRadius: "8px",
            border: `1px solid ${colors.header.border}`,
            flex: 1,
            minWidth: "240px",
          }}
        >
          <Search size={18} color={colors.text.muted} />
          <input
            type="text"
            placeholder="Search staff by name, attraction, role, or counter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontFamily: typography.fontFamily.sans,
              fontSize: "14px",
              background: "transparent",
              color: colors.text.primary,
            }}
          />
        </div>
      </div>

      {/* Click-to-view hint */}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(s) => s.id}
        pageSize={5}
        emptyMessage="No staff records found matching your search."
      />

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(1,27,47,0.65)",
            backdropFilter: "blur(4px)",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "580px",
              background: "#FFFFFF",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: colors.sidebar.bg,
                color: "#FFFFFF",
                padding: "18px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                Add New Staff Member
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#FFFFFF" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              onSubmit={handleAddSubmit}
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxHeight: "75vh",
                overflowY: "auto",
              }}
            >
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>
                  Full Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter staff full name"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors((p) => ({ ...p, name: "" })); }}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: `1.5px solid ${formErrors.name ? "#EF4444" : "#CBD5E1"}`,
                    padding: "0 12px",
                    marginTop: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                {formErrors.name && <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>{formErrors.name}</span>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>
                    Phone Number <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) });
                      setFormErrors((p) => ({ ...p, phone: "" }));
                    }}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: `1.5px solid ${formErrors.phone ? "#EF4444" : "#CBD5E1"}`,
                      padding: "0 12px",
                      marginTop: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.phone && <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>{formErrors.phone}</span>}
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>
                    Email Address <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="staff@gmail.com"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFormErrors((p) => ({ ...p, email: "" })); }}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: `1.5px solid ${formErrors.email ? "#EF4444" : "#CBD5E1"}`,
                      padding: "0 12px",
                      marginTop: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.email && <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>{formErrors.email}</span>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <MultiSelect
                  label="Assigned Attraction"
                  required
                  options={attractions.map((a) => a.name)}
                  selected={formData.assignedAttraction}
                  onChange={(vals) => { setFormData({ ...formData, assignedAttraction: vals }); setFormErrors((p) => ({ ...p, assignedAttraction: "" })); }}
                  error={formErrors.assignedAttraction}
                />
                <MultiSelect
                  label="Staff Role"
                  required
                  options={["Counter Operator", "Validator", "Helpdesk", "Supervisor"]}
                  selected={formData.role}
                  onChange={(vals) => { setFormData({ ...formData, role: vals }); setFormErrors((p) => ({ ...p, role: "" })); }}
                  error={formErrors.role}
                />
              </div>

              {/* Status Toggle — Add Modal */}
              <StatusToggle
                label="Staff Account Status"
                required
                value={formData.status}
                onChange={(status) => setFormData({ ...formData, status })}
                error={formErrors.status}
              />

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                  paddingTop: "16px",
                  borderTop: `1px solid ${colors.header.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.login.inputBorder}`,
                    background: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: colors.brand.primary,
                    color: colors.sidebar.activeText,
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily.sans,
                    boxShadow: "0 4px 12px rgba(244,188,67,0.3)",
                  }}
                >
                  <Plus size={16} />
                  <span>Create Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }
    </div >
  );
}

// Suspense wrapper required by Next.js for useSearchParams()
export default function StaffManagementPage() {
  return (
    <Suspense fallback={null}>
      <RoleGuard allowedRoles={["Admin", "Manager"]}>
        <StaffManagementInner />
      </RoleGuard>
    </Suspense>
  );
}
