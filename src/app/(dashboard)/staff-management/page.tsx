"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  SearchX,
  Plus,
  Edit2,
  Trash2,
  Building,
  Ticket,
  Eye,
  EyeOff,
  ArrowLeft,
  Filter,
  X,
  UserX,
  UserPlus,
  Loader2,
  BarChart2,
  Clock,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { StaffUser } from "./types";
import { DataTable, Column } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/Toast";
import { confirmAdd, confirmDelete, confirmStatusChange } from "@/lib/notify";
import { staffSchema } from "./schema";
import { META_CONSTANTS } from "@/lib/metaConstant";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusToggle from "@/components/ui/StatusToggle";
import StatusFilterSelect from "@/components/ui/StatusFilterSelect";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import { RoleGuard } from "@/components/auth/RoleGuard";
import ExportButtons from "@/components/ui/ExportButtons";
import ReportTimingModal from "@/components/modals/ReportTimingModal";
import {
  useStaffList,
  fetchStaffList,
  useCreateStaff,
  useUpdateStaff,
  useDisableStaff,
  useDeleteStaff,
  StaffQueryParams,
} from "@/hooks/useStaffQueries";
import {
  ExportScope,
  exportTableToPDF,
  exportToCSV,
  renderStatusBadgeHTML,
  fetchAllPages,
} from "@/lib/exportUtils";
import { useAttractions, AttractionItem } from "@/hooks/useManagerQueries";

const MultiSelect = MultiSelectDropdown;

const STAFF_ROLES = [
  "Counter Operator",
  "Validator",
  "Helpdesk",
  "Supervisor",
  "Reports Access",
];

function StaffManagementInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAttractionFilter, setSelectedAttractionFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(
    searchParams.get("status") ?? "All"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedAttractionFilter, selectedStatusFilter]);

  useEffect(() => {
    document.title = META_CONSTANTS.staffManagement.fullTitle;
  }, []);

  // Attractions Query
  const { data: attractionsData = [] } = useAttractions();
  const attractionsList: AttractionItem[] = attractionsData;

  // Status mapping for API
  const apiStatus =
    selectedStatusFilter === "Active" || selectedStatusFilter === "ACTIVE"
      ? "ACTIVE"
      : selectedStatusFilter === "Inactive" || selectedStatusFilter === "INACTIVE"
        ? "INACTIVE"
        : undefined;

  // Staff Queries & Mutations
  const {
    data: staffData,
    isLoading: isFetchingStaff,
    isFetching,
  } = useStaffList({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: apiStatus,
    attractionId: selectedAttractionFilter !== "All" ? selectedAttractionFilter : undefined,
  });

  const pagination = staffData?.pagination ?? {
    page: currentPage,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const disableStaffMutation = useDisableStaff();
  const deleteStaffMutation = useDeleteStaff();

  const rawStaffItems = staffData?.items ?? [];

  // Normalize staff items for display
  const staffList: StaffUser[] = rawStaffItems.map((s) => {
    // Normalize a single role item — API may return string OR {id, role} object
    const normalizeRole = (r: any): string => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object") {
        return r.role || r.name || r.key || r.title || String(r);
      }
      return String(r);
    };

    const rolesArr: string[] = Array.isArray(s.role)
      ? (s.role as any[]).map(normalizeRole)
      : Array.isArray(s.roles)
        ? (s.roles as any[]).map(normalizeRole)
        : typeof s.role === "string" && s.role
          ? [s.role]
          : s.role && typeof s.role === "object"
            ? [normalizeRole(s.role)]
            : ["STAFF"];

    let hasReportsAccess = s.canViewReports ?? false;
    let durationHours: number | null = s.reportViewDurationHours ?? null;

    const normalizedRoles = rolesArr.map((r) => {
      if (r.toLowerCase().startsWith("reports access")) {
        hasReportsAccess = true;
        const match = r.match(/(\d+)/);
        if (match && !durationHours) {
          durationHours = parseInt(match[1], 10);
        }
        return "Reports Access";
      }
      return r;
    });

    if (hasReportsAccess && !durationHours) {
      durationHours = 24;
    }

    const attractionNames =
      s.assignedAttraction && s.assignedAttraction.length > 0
        ? s.assignedAttraction
        : s.attractions && s.attractions.length > 0
          ? s.attractions.map((a) => a.name)
          : [];

    return {
      id: s.id,
      name: s.name || "—",
      email: s.email || "—",
      phone: s.phone ?? "—",
      role: normalizedRoles,
      roles: normalizedRoles,
      assignedAttraction: attractionNames,
      attractions: s.attractions || [],
      attractionIds: s.attractionIds || s.attractions?.map((a) => a.id) || [],
      joinedDate: s.joinedDate
        ? new Date(s.joinedDate).toLocaleDateString("en-IN")
        : s.createdAt
          ? new Date(s.createdAt).toLocaleDateString("en-IN")
          : "—",
      status: s.status,
      ticketsIssued: s.ticketsIssued ?? 0,
      canViewReports: hasReportsAccess,
      reportViewDurationHours: durationHours,
    };
  });

  // Modal & Selection States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Report Access Timing Modal State
  const [isReportTimingModalOpen, setIsReportTimingModalOpen] = useState(false);
  const [timingModalTarget, setTimingModalTarget] = useState<"add" | "edit">("add");
  const [pendingRoleSelection, setPendingRoleSelection] = useState<string[] | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: [] as string[],
    assignedAttraction: [] as string[],
    status: "Active" as "Active" | "Inactive",
    canViewReports: false,
    reportViewDurationHours: "" as string | number,
  });

  // Validation errors from Zod
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: [],
      assignedAttraction: [],
      status: "Active",
      canViewReports: false,
      reportViewDurationHours: "",
    });
    setFormErrors({});
    setPendingRoleSelection(null);
  };

  const isStaffFiltered =
    search.trim() !== "" ||
    selectedAttractionFilter !== "All" ||
    selectedStatusFilter !== "All";

  const handleResetStaffFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedAttractionFilter("All");
    setSelectedStatusFilter("All");
  };

  // Handlers
  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffUser) => {
    setSelectedStaff(staff);
    const roleArr = Array.isArray(staff.role) ? staff.role : [String(staff.role)];
    const attrArr = staff.assignedAttraction || [];
    const isAct = String(staff.status).toUpperCase() === "ACTIVE";

    let hasReports = staff.canViewReports ?? false;
    let duration: number | string = staff.reportViewDurationHours ?? "";

    const cleanedRoles = roleArr.map((r) => {
      if (r.toLowerCase().startsWith("reports access")) {
        hasReports = true;
        const match = r.match(/(\d+)/);
        if (match && !duration) {
          duration = parseInt(match[1], 10);
        }
        return "Reports Access";
      }
      return r;
    });

    if (hasReports && !cleanedRoles.includes("Reports Access")) {
      cleanedRoles.push("Reports Access");
    }
    if (hasReports && !duration) {
      duration = 24;
    }

    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone && staff.phone !== "—" ? staff.phone : "",
      password: "",
      role: cleanedRoles,
      assignedAttraction: [...attrArr],
      status: isAct ? "Active" : "Inactive",
      canViewReports: hasReports,
      reportViewDurationHours: duration,
    });
    setIsEditing(true);
  };

  // Role dropdown change handler with Reports Access modal trigger
  const handleRoleChange = (newRoles: string[], target: "add" | "edit") => {
    const isAddingReportsAccess =
      newRoles.includes("Reports Access") && !formData.role.includes("Reports Access");
    const isRemovingReportsAccess =
      !newRoles.includes("Reports Access") && formData.role.includes("Reports Access");

    if (isAddingReportsAccess) {
      // 1. Immediately enable the tick in the dropdown and form
      setFormData((prev) => ({
        ...prev,
        role: newRoles,
      }));
      setFormErrors((p) => ({ ...p, role: "" }));
      setPendingRoleSelection(newRoles);
      setTimingModalTarget(target);
      // 2. Open timing modal only when tick is enabled
      setIsReportTimingModalOpen(true);
    } else if (isRemovingReportsAccess) {
      // When unticking / disabling Reports Access, modal does not open
      setFormData((prev) => ({
        ...prev,
        role: newRoles,
        canViewReports: false,
        reportViewDurationHours: "",
      }));
      setFormErrors((p) => ({ ...p, role: "", reportViewDurationHours: "" }));
    } else {
      setFormData((prev) => ({ ...prev, role: newRoles }));
      setFormErrors((p) => ({ ...p, role: "" }));
    }
  };

  // Apply Reports Access Timing from popup modal
  const handleApplyReportTiming = (hours: number) => {
    const nextRoles = pendingRoleSelection
      ? pendingRoleSelection
      : formData.role.includes("Reports Access")
        ? formData.role
        : [...formData.role, "Reports Access"];

    setFormData((prev) => ({
      ...prev,
      role: nextRoles,
      canViewReports: true,
      reportViewDurationHours: hours,
    }));

    if (typeof window !== "undefined") {
      sessionStorage.setItem("staffReportTimingHours", String(hours));
      sessionStorage.setItem("lastAssignedReportDurationHours", String(hours));
      localStorage.setItem("staffReportTimingHours", String(hours));
      sessionStorage.setItem(
        "staffRoles",
        JSON.stringify([...nextRoles, `Reports Access (${hours}h)`])
      );
    }

    setPendingRoleSelection(null);
    setIsReportTimingModalOpen(false);
    setFormErrors((p) => ({ ...p, role: "", reportViewDurationHours: "" }));
  };

  // Cancel Reports Access Timing modal
  const handleCloseReportTimingModal = () => {
    // If not previously confirmed, remove Reports Access from role so tick is disabled
    if (!formData.canViewReports) {
      setFormData((prev) => ({
        ...prev,
        role: prev.role.filter((r) => r !== "Reports Access"),
        reportViewDurationHours: "",
      }));
    }
    setPendingRoleSelection(null);
    setIsReportTimingModalOpen(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data for validation — normalize optional fields so empty string doesn't fail validation
    const dataToValidate = {
      ...formData,
      reportViewDurationHours:
        !formData.canViewReports ||
          formData.reportViewDurationHours === "" ||
          formData.reportViewDurationHours === null ||
          formData.reportViewDurationHours === undefined
          ? undefined
          : formData.reportViewDurationHours,
    };

    // Zod validation
    const result = staffSchema.safeParse(dataToValidate);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        errs[field] = issue.message;
      });
      setFormErrors(errs);
      return;
    }

    if (!formData.password?.trim()) {
      setFormErrors((p) => ({ ...p, password: "Password is required for new staff accounts" }));
      return;
    }

    setFormErrors({});

    const confirmed = await confirmAdd(`staff member "${formData.name}"`);
    if (!confirmed) {
      return;
    }

    // Map selected attraction names to IDs
    const attractionIds = formData.assignedAttraction
      .map((name) => attractionsList.find((a) => a.name === name)?.id)
      .filter(Boolean) as string[];

    // Format roles: tag Reports Access with assigned duration for display and persistence
    const finalRoles = formData.role.map((r) => {
      if (r === "Reports Access") {
        const hours = formData.reportViewDurationHours || 24;
        return `Reports Access (${hours}h)`;
      }
      return r;
    });

    try {
      await createStaffMutation.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        roles: finalRoles.length > 0 ? finalRoles : ["STAFF"],
        attractionIds: attractionIds.length > 0 ? attractionIds : [],
        status: formData.status === "Active" ? "ACTIVE" : "INACTIVE",
        canViewReports: formData.role.includes("Reports Access"),
        reportViewDurationHours: formData.role.includes("Reports Access")
          ? Number(formData.reportViewDurationHours || 24)
          : null,
      });
      setIsAddModalOpen(false);
      resetForm();
    } catch {
      // Handled by onError in mutation
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedStaff) return;

    // Prepare data for validation — normalize optional fields so empty string doesn't fail validation
    const dataToValidate = {
      ...formData,
      reportViewDurationHours:
        !formData.canViewReports ||
          formData.reportViewDurationHours === "" ||
          formData.reportViewDurationHours === null ||
          formData.reportViewDurationHours === undefined
          ? undefined
          : formData.reportViewDurationHours,
    };

    // Zod validation
    const result = staffSchema.safeParse(dataToValidate);
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

    const attractionIds = formData.assignedAttraction
      .map((name) => attractionsList.find((a) => a.name === name)?.id)
      .filter(Boolean) as string[];

    const finalRoles = formData.role.map((r) => {
      if (r === "Reports Access") {
        const hours = formData.reportViewDurationHours || 24;
        return `Reports Access (${hours}h)`;
      }
      return r;
    });

    try {
      await updateStaffMutation.mutateAsync({
        staffId: selectedStaff.id,
        data: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password?.trim() ? formData.password : undefined,
          roles: finalRoles.length > 0 ? finalRoles : ["STAFF"],
          attractionIds: attractionIds.length > 0 ? attractionIds : [],
          status: formData.status === "Active" ? "ACTIVE" : "INACTIVE",
          canViewReports: formData.role.includes("Reports Access"),
          reportViewDurationHours: formData.role.includes("Reports Access")
            ? Number(formData.reportViewDurationHours || 24)
            : null,
        },
      });

      setSelectedStaff({
        ...selectedStaff,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        roles: formData.role,
        assignedAttraction: formData.assignedAttraction,
        status: formData.status === "Active" ? "ACTIVE" : "INACTIVE",
        canViewReports: formData.canViewReports,
        reportViewDurationHours: formData.canViewReports && formData.reportViewDurationHours !== ""
          ? Number(formData.reportViewDurationHours)
          : null,
      });
      setIsEditing(false);
    } catch {
      // Handled by onError
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const target = staffList.find((s) => s.id === id);
    const confirmed = await confirmDelete(`staff member "${target?.name ?? id}"`);
    if (!confirmed) return;

    try {
      await deleteStaffMutation.mutateAsync(id);
      setSelectedStaff(null);
      setIsEditing(false);
    } catch {
      // Handled by onError
    }
  };

  const handleStatusToggle = async (staff: StaffUser, newStatus: StaffUser["status"]) => {
    const confirmed = await confirmStatusChange(staff.name, newStatus);
    if (!confirmed) return;

    try {
      if (newStatus === "Inactive" || newStatus === "INACTIVE") {
        await disableStaffMutation.mutateAsync(staff.id);
      } else {
        await updateStaffMutation.mutateAsync({
          staffId: staff.id,
          data: { status: "ACTIVE" },
        });
      }

      if (selectedStaff?.id === staff.id) {
        setSelectedStaff({ ...selectedStaff, status: newStatus });
      }
    } catch {
      // Handled by onError
    }
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ── Export Handlers (Scoped Export) ───────────────────────────────────────
  const getFilterInfo = () => {
    const parts: string[] = [];
    if (selectedAttractionFilter !== "All") {
      const found = attractionsList.find((a) => a.id === selectedAttractionFilter);
      parts.push(`Attraction: ${found?.name || selectedAttractionFilter}`);
    }
    if (selectedStatusFilter !== "All") parts.push(`Status: ${selectedStatusFilter}`);
    if (search) parts.push(`Search: "${search}"`);
    return parts.length > 0 ? parts.join(" | ") : undefined;
  };

  const getExportData = async (scope: ExportScope) => {
    const base: StaffQueryParams = {
      search: search.trim() || undefined,
      status: apiStatus,
      attractionId: selectedAttractionFilter !== "All" ? selectedAttractionFilter : undefined,
    };

    if (scope === "current") {
      const res = await fetchStaffList({ ...base, page: currentPage, limit: pageSize });
      return res.items;
    } else {
      return await fetchAllPages((page, limit) =>
        fetchStaffList({ ...base, page, limit })
      );
    }
  };

  const handleExportPDF = async (scope: ExportScope) => {
    setIsExportingPDF(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) {
        showToast("No staff data matches current filters", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : "Current";
      await exportTableToPDF({
        title: "STAFF MEMBERS REPORT",
        filterInfo: getFilterInfo(),
        scope,
        filename: `Staff_${scopeLabel}_${dateKey}.pdf`,
        orientation: "landscape",
        columns: [
          { header: "#", accessor: (_, i) => (scope === "all" ? i + 1 : (currentPage - 1) * pageSize + i + 1), width: "35px" },
          { header: "Staff Name", accessor: (s: any) => s.name || "-" },
          { header: "Email Address", accessor: (s: any) => s.email || "-" },
          { header: "Phone", accessor: (s: any) => s.phone || "-" },
          {
            header: "Role",
            accessor: (s: any) =>
              Array.isArray(s.role) ? s.role.join(", ") : Array.isArray(s.roles) ? s.roles.join(", ") : s.role || "-",
          },
          {
            header: "Attraction",
            accessor: (s: any) =>
              Array.isArray(s.assignedAttraction) && s.assignedAttraction.length > 0
                ? s.assignedAttraction.join(", ")
                : Array.isArray(s.attractions) && s.attractions.length > 0
                  ? s.attractions.map((a: any) => a.name).join(", ")
                  : "-",
          },
          {
            header: "Status",
            renderCell: (s: any) => renderStatusBadgeHTML(String(s.status).toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE"),
            align: "center",
          },
        ],
        data: items,
        summaryCards: [
          { label: "Total Staff", value: items.length },
          { label: "Active Staff", value: items.filter((s: any) => String(s.status).toUpperCase() === "ACTIVE").length },
        ],
      });
      showToast(`PDF downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Staff PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async (scope: ExportScope) => {
    setIsExportingExcel(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) {
        showToast("No staff data matches current filters", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : "Current";
      const headers = ["#", "Staff Name", "Email Address", "Phone", "Role", "Attraction", "Status"];
      const rows = items.map((s: any, i: number) => {
        const roles = Array.isArray(s.role) ? s.role.join(", ") : Array.isArray(s.roles) ? s.roles.join(", ") : s.role || "-";
        const attrs =
          Array.isArray(s.assignedAttraction) && s.assignedAttraction.length > 0
            ? s.assignedAttraction.join(", ")
            : Array.isArray(s.attractions) && s.attractions.length > 0
              ? s.attractions.map((a: any) => a.name).join(", ")
              : "-";
        return [
          scope === "all" ? i + 1 : (currentPage - 1) * pageSize + i + 1,
          s.name || "-",
          s.email || "-",
          s.phone || "-",
          roles,
          attrs,
          String(s.status).toUpperCase() === "ACTIVE" ? "Active" : "Inactive",
        ];
      });
      exportToCSV(`Staff_${scopeLabel}_${dateKey}`, headers, rows);
      showToast(`Excel downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Staff Excel export error:", err);
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // DataTable Columns
  const handleRowClick = (s: StaffUser) => {
    setSelectedStaff(s);
    const roleArr = Array.isArray(s.role) ? s.role : [String(s.role)];
    const attrArr = s.assignedAttraction || [];
    const isAct = String(s.status).toUpperCase() === "ACTIVE";

    setFormData({
      name: s.name,
      email: s.email,
      phone: s.phone && s.phone !== "—" ? s.phone : "",
      password: "",
      role: [...roleArr],
      assignedAttraction: [...attrArr],
      status: isAct ? "Active" : "Inactive",
      canViewReports: s.canViewReports ?? false,
      reportViewDurationHours: s.reportViewDurationHours ?? "",
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
          <div>
            <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: "14px" }}>
              {s.name}
            </div>
            <div style={{ fontSize: "12px", color: colors.text.muted }}>
              {s.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Phone",
      cell: (s) => (
        <span style={{ fontSize: "13px", color: colors.text.primary, fontWeight: 500 }}>
          {s.phone || "—"}
        </span>
      ),
    },
    {
      header: "Role",
      cell: (s) => {
        const roles = Array.isArray(s.role) ? s.role : [String(s.role)];
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {roles.map((r) => {
              const isReports = r.toLowerCase().startsWith("reports access");
              const label = isReports && s.reportViewDurationHours
                ? `Reports Access (${s.reportViewDurationHours}h)`
                : r;
              return (
                <span
                  key={r}
                  style={{
                    background: isReports ? "#EFF6FF" : "rgba(35,114,165,0.08)",
                    color: isReports ? "#1D4ED8" : colors.brand.accent,
                    border: isReports ? "1px solid #BFDBFE" : "none",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: typography.fontFamily.sans,
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isReports && <BarChart2 size={12} color="#2563EB" />}
                  {label}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      header: "Attraction",
      cell: (s) => {
        const attrs = s.assignedAttraction && s.assignedAttraction.length > 0 ? s.assignedAttraction : ["—"];
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {attrs.map((a, idx) => (
              <span
                key={`${a}-${idx}`}
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
                {a !== "—" && <Building size={11} />}
                {a}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (s) => {
        const isAct = String(s.status).toUpperCase() === "ACTIVE";
        return <StatusBadge status={isAct ? "Active" : "Inactive"} />;
      },
    },
    {
      header: "Action",
      align: "right",
      cell: (s) => (
        <button
          onClick={() => handleRowClick(s)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(35,114,165,0.1)",
            color: colors.brand.accent,
            border: `1px solid ${colors.brand.accent}`,
            borderRadius: "6px",
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    },
  ];

  // ─── Detail / Edit View ──────────────────────────────────────────────────
  if (selectedStaff) {
    const isAct = String(selectedStaff.status).toUpperCase() === "ACTIVE";
    const selectedRoles = Array.isArray(selectedStaff.role) ? selectedStaff.role : [String(selectedStaff.role)];

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
                    background: isAct ? "#F0FDF4" : "#FEF2F2",
                    color: isAct ? colors.status.success : colors.status.error,
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {isAct ? "Active" : "Inactive"}
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
                Assigned Attractions:{" "}
                <strong>
                  {selectedStaff.assignedAttraction && selectedStaff.assignedAttraction.length > 0
                    ? selectedStaff.assignedAttraction.join(", ")
                    : "None"}
                </strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditing ? (
              <>
                <button
                  type="button"
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
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updateStaffMutation.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: updateStaffMutation.isPending ? "#E5E7EB" : colors.brand.primary,
                    color: updateStaffMutation.isPending ? "#6B7280" : colors.sidebar.activeText,
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: updateStaffMutation.isPending ? "not-allowed" : "pointer",
                    fontFamily: typography.fontFamily.sans,
                    boxShadow: updateStaffMutation.isPending ? "none" : "0 4px 12px rgba(244,188,67,0.3)",
                  }}
                >
                  {updateStaffMutation.isPending ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedStaff)}
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
                  type="button"
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
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors((p) => ({ ...p, name: "" }));
                  }}
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
                {formErrors.name && (
                  <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>
                    {formErrors.name}
                  </span>
                )}
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setFormErrors((p) => ({ ...p, email: "" }));
                  }}
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
                {formErrors.email && (
                  <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>
                    {formErrors.email}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  maxLength={10}
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
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>
                  Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: "1.5px solid #CBD5E1",
                    padding: "0 12px",
                    marginTop: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <MultiSelect
                label="Assigned Attraction"
                required
                options={attractionsList.map((a) => a.name)}
                selected={formData.assignedAttraction}
                onChange={(vals) => {
                  setFormData({ ...formData, assignedAttraction: vals });
                  setFormErrors((p) => ({ ...p, assignedAttraction: "" }));
                }}
                forceClose={isReportTimingModalOpen}
                error={formErrors.assignedAttraction}
              />
              <div>
                <MultiSelect
                  label="Staff Role"
                  required
                  options={STAFF_ROLES}
                  selected={formData.role}
                  onChange={(vals) => handleRoleChange(vals, "edit")}
                  closeOnSelectOption={(opt) => opt === "Reports Access"}
                  forceClose={isReportTimingModalOpen}
                  error={formErrors.role}
                />
                {formData.role.includes("Reports Access") && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(244, 188, 67, 0.12)",
                      border: "1px solid rgba(244, 188, 67, 0.45)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Clock size={16} color="#B45309" />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0C2A42" }}>
                        Reports Access:{" "}
                        <span style={{ fontWeight: 700 }}>
                          Past {formData.reportViewDurationHours || 24} Hours ({((Number(formData.reportViewDurationHours) || 24) / 24).toFixed(1).replace(/\.0$/, "")} Days)
                        </span>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setTimingModalTarget("edit");
                          setIsReportTimingModalOpen(true);
                        }}
                        style={{
                          background: colors.brand.primary,
                          border: "none",
                          color: colors.sidebar.activeText,
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 1px 4px rgba(244,188,67,0.3)",
                        }}
                      >
                        <Edit2 size={12} /> Edit Timing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            role: formData.role.filter((r) => r !== "Reports Access"),
                            canViewReports: false,
                            reportViewDurationHours: "",
                          });
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#64748B",
                          padding: "4px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Remove Reports Access"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Personal Info */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  border: "1px solid #F1F5F9",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: colors.text.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Personal Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "#0C2A42",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {selectedStaff.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "16px", color: "#011B2F" }}>
                        {selectedStaff.name}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      paddingTop: "8px",
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600 }}>
                        Email
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>
                        {selectedStaff.email}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600 }}>
                        Phone
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>
                        {selectedStaff.phone}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600 }}>
                        Joined Date
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>
                        {selectedStaff.joinedDate}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600 }}>
                        Role
                      </div>
                      <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {selectedRoles.map((r) => {
                          const isReports = r.toLowerCase().startsWith("reports access");
                          const hours = selectedStaff.reportViewDurationHours || 24;
                          const days = ((Number(hours) || 24) / 24).toFixed(1).replace(/\.0$/, "");
                          const label = isReports
                            ? `Reports Access: Past ${hours} Hours (${days} Days)`
                            : r;
                          return (
                            <span
                              key={r}
                              style={{
                                background: isReports ? "rgba(244, 188, 67, 0.15)" : "rgba(35,114,165,0.1)",
                                color: isReports ? "#0C2A42" : colors.brand.accent,
                                border: isReports ? "1px solid rgba(244, 188, 67, 0.5)" : "none",
                                padding: "3px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              {isReports && <BarChart2 size={13} color="#B45309" />}
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance & Status */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  border: "1px solid #F1F5F9",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: colors.text.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Performance &amp; Account Status
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Reports Access Privilege Card */}
                  {(selectedStaff.canViewReports || selectedRoles.some((r) => r.toLowerCase().startsWith("reports access"))) && (
                    <div
                      style={{
                        background: "rgba(244, 188, 67, 0.12)",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        border: "1.5px solid rgba(244, 188, 67, 0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            background: "#F4BC43",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 2px 6px rgba(244,188,67,0.3)",
                          }}
                        >
                          <BarChart2 size={20} color="#0C2A42" strokeWidth={2.2} />
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0C2A42" }}>
                            Reports Access: Past {selectedStaff.reportViewDurationHours || 24} Hours ({((Number(selectedStaff.reportViewDurationHours) || 24) / 24).toFixed(1).replace(/\.0$/, "")} Days)
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                            Staff member can view historical reports and analytics within this assigned past time window.
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          background: "#0C2A42",
                          color: "#F4BC43",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "6px",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                        }}
                      >
                        Active
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      background: "rgba(35,114,165,0.05)",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600 }}>
                        Total Tickets Processed
                      </div>
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: 800,
                          color: "#0C2A42",
                          fontFamily: typography.fontFamily.sans,
                          marginTop: "4px",
                        }}
                      >
                        {(selectedStaff.ticketsIssued ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: colors.brand.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ticket size={24} color="#0C2A42" />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: colors.text.muted, fontWeight: 600, marginBottom: "8px" }}>
                      Account Status
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: isAct ? "#ECFDF5" : "#FEE2E2",
                        color: isAct ? "#059669" : "#DC2626",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: isAct ? "#059669" : "#DC2626",
                        }}
                      />
                      {isAct ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attraction Assignment */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                border: "1px solid #F1F5F9",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: colors.text.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Attraction Assignment
              </h3>
              <div>
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedStaff.assignedAttraction && selectedStaff.assignedAttraction.length > 0 ? (
                    selectedStaff.assignedAttraction.map((a, idx) => (
                      <span
                        key={`${a}-${idx}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          color: "#0F172A",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: 700,
                        }}
                      >
                        <Building size={14} color="#2372A5" />
                        {a}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "13px", color: colors.text.muted }}>
                      No attractions assigned.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Staff List View ─────────────────────────────────────────────────
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ExportButtons
            onExportPDFScope={handleExportPDF}
            onExportExcelScope={handleExportExcel}
            isExportingPDF={isExportingPDF}
            isExportingExcel={isExportingExcel}
            disabled={isFetchingStaff || (staffList.length === 0 && (staffData?.pagination?.total ?? 0) === 0)}
          />

          <button
            type="button"
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
              maxWidth: "220px",
            }}
          >
            <option value="All">All Attractions</option>
            {attractionsList.map((att) => (
              <option key={att.id} value={att.id}>
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
            placeholder="Search staff by name, email, or phone..."
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

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={staffList}
        keyExtractor={(s) => s.id}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        isLoading={isFetchingStaff}
        emptyIcon={
          isStaffFiltered ? (
            <SearchX size={26} color={colors.brand.accent} />
          ) : (
            <UserX size={26} color={colors.brand.accent} />
          )
        }
        emptyTitle={
          isStaffFiltered ? "No Matching Staff Found" : "No Staff Members Found"
        }
        emptyDescription={
          isStaffFiltered
            ? search.trim()
              ? `No staff records found matching "${search}". Try adjusting your keywords or clearing your filters.`
              : "No staff records match the selected filter criteria. Try adjusting or clearing your filters."
            : "There are currently no staff records in the system. Click 'Add Staff' to register your first staff member."
        }
        emptyAction={
          isStaffFiltered ? (
            <button
              type="button"
              onClick={handleResetStaffFilters}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: `1px solid ${colors.header.border}`,
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                color: colors.brand.accent,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              Clear Filters &amp; Search
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                background: colors.brand.primary,
                color: colors.sidebar.activeText,
                border: "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 3px 8px rgba(244,188,67,0.3)",
              }}
            >
              <UserPlus size={15} />
              <span>Add Staff</span>
            </button>
          )
        }
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
                type="button"
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
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors((p) => ({ ...p, name: "" }));
                  }}
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
                {formErrors.name && (
                  <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>
                    {formErrors.name}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>
                    Phone Number <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Enter the phone number"
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
                  {formErrors.phone && (
                    <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>
                      {formErrors.phone}
                    </span>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>
                    Email Address <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter the email address"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setFormErrors((p) => ({ ...p, email: "" }));
                    }}
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
                  {formErrors.email && (
                    <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>
                      {formErrors.email}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary }}>
                  Password <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: "4px" }}>
                  <input
                    type={showAddPassword ? "text" : "password"}
                    placeholder="Enter secure password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setFormErrors((p) => ({ ...p, password: "" }));
                    }}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: `1.5px solid ${formErrors.password ? "#EF4444" : "#CBD5E1"}`,
                      padding: "0 40px 0 12px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: colors.text.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                    }}
                    tabIndex={-1}
                    aria-label={showAddPassword ? "Hide password" : "Show password"}
                  >
                    {showAddPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && (
                  <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "2px", display: "block" }}>
                    {formErrors.password}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <MultiSelect
                  label="Assigned Attraction"
                  required
                  options={attractionsList.map((a) => a.name)}
                  selected={formData.assignedAttraction}
                  onChange={(vals) => {
                    setFormData({ ...formData, assignedAttraction: vals });
                    setFormErrors((p) => ({ ...p, assignedAttraction: "" }));
                  }}
                  forceClose={isReportTimingModalOpen}
                  error={formErrors.assignedAttraction}
                />
                <div>
                  <MultiSelect
                    label="Staff Role"
                    required
                    options={STAFF_ROLES}
                    selected={formData.role}
                    onChange={(vals) => handleRoleChange(vals, "add")}
                    closeOnSelectOption={(opt) => opt === "Reports Access"}
                    forceClose={isReportTimingModalOpen}
                    error={formErrors.role}
                  />
                </div>
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
                  disabled={createStaffMutation.isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: createStaffMutation.isPending ? "#E5E7EB" : colors.brand.primary,
                    color: createStaffMutation.isPending ? "#6B7280" : colors.sidebar.activeText,
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: createStaffMutation.isPending ? "not-allowed" : "pointer",
                    fontFamily: typography.fontFamily.sans,
                    boxShadow: createStaffMutation.isPending ? "none" : "0 4px 12px rgba(244,188,67,0.3)",
                  }}
                >
                  {createStaffMutation.isPending ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Creating Staff Member...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Create Staff Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reports Access Timing Modal */}
      <ReportTimingModal
        isOpen={isReportTimingModalOpen}
        onClose={handleCloseReportTimingModal}
        onApply={handleApplyReportTiming}
        currentHours={formData.reportViewDurationHours ? Number(formData.reportViewDurationHours) : 24}
        targetLabel={timingModalTarget === "add" ? "New Staff Member" : (formData.name || "Staff Member")}
      />
    </div>
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

