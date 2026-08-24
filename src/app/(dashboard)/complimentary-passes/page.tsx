"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  RotateCcw,
  Edit2,
  Trash2,
  Ticket,
  Users,
  SearchX,
} from "lucide-react";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";
import { confirmDelete } from "@/lib/notify";
import { useToast } from "@/components/ui/Toast";
import DateRangePicker from "@/components/ui/DateRangePicker";
import ExportButtons from "@/components/ui/ExportButtons";
import { colors, typography } from "@/lib/theme";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { useAttractions } from "@/hooks/useManagerQueries";
import {
  useComplimentaryPassList,
  fetchComplimentaryPassList,
  useCreateComplimentaryPass,
  useUpdateComplimentaryPass,
  useDeleteComplimentaryPass,
  ComplimentaryPassListParams,
} from "@/hooks/useComplimentaryPassQueries";
import {
  useReferenceList,
  fetchReferenceList,
  useCreateReference,
  useUpdateReference,
  useDeleteReference,
  ReferenceListParams,
} from "@/hooks/useReferenceQueries";
import {
  ExportScope,
  exportTableToPDF,
  exportToCSV,
  renderStatusBadgeHTML,
} from "@/lib/exportUtils";
import type {
  ComplimentaryPass,
  Reference,
  ComplimentaryPassPayload,
  ReferencePayload,
} from "./types";
import IssueComplimentaryPassModal from "@/components/modals/IssueComplimentaryPassModal";
import AddReferenceModal from "@/components/modals/AddReferenceModal";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status?: string }) {
  const upper = (status || "ACTIVE").toUpperCase();
  let bg = "#DCFCE7";
  let text = "#15803D";
  let dot = "#16A34A";
  let label = "Active";

  if (upper === "USED") {
    bg = "#EFF6FF";
    text = "#1D4ED8";
    dot = "#2563EB";
    label = "Used";
  } else if (upper === "EXPIRED" || upper === "INACTIVE") {
    bg = "#F3F4F6";
    text = "#4B5563";
    dot = "#9CA3AF";
    label = upper === "INACTIVE" ? "Inactive" : "Expired";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "9999px",
        background: bg,
        fontWeight: 600,
        fontSize: "12px",
        color: text,
      }}
    >
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: dot }} />
      {label}
    </span>
  );
}

const PAGE_SIZE = 10;

export default function ComplimentaryPassesPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"passes" | "references">("passes");

  // ── Modals State ───────────────────────────────────────────────────────────
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passToEdit, setPassToEdit] = useState<ComplimentaryPass | null>(null);
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [refToEdit, setRefToEdit] = useState<Reference | null>(null);

  // ── Actions dropdown state ─────────────────────────────────────────────────
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.complimentaryPasses.fullTitle;
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Complimentary Passes Filters ───────────────────────────────────────────
  const [passSearch, setPassSearch] = useState("");
  const [debouncedPassSearch, setDebouncedPassSearch] = useState("");
  const [selectedAttraction, setSelectedAttraction] = useState("ALL");
  const [selectedPassStatus, setSelectedPassStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [passPage, setPassPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPassSearch(passSearch), 400);
    return () => clearTimeout(timer);
  }, [passSearch]);

  useEffect(() => {
    setPassPage(1);
  }, [debouncedPassSearch, selectedAttraction, selectedPassStatus, fromDate, toDate]);

  // ── References Filters ─────────────────────────────────────────────────────
  const [refSearch, setRefSearch] = useState("");
  const [debouncedRefSearch, setDebouncedRefSearch] = useState("");
  const [refPage, setRefPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRefSearch(refSearch), 400);
    return () => clearTimeout(timer);
  }, [refSearch]);

  useEffect(() => {
    setRefPage(1);
  }, [debouncedRefSearch]);

  // ── API Queries ────────────────────────────────────────────────────────────
  const { data: attractionsData } = useAttractions();
  const attractionOptions = useMemo(() => {
    return Array.isArray(attractionsData) ? attractionsData : [];
  }, [attractionsData]);

  // Passes query
  const passQueryParams = {
    page: passPage,
    limit: PAGE_SIZE,
    search: debouncedPassSearch || undefined,
    attractionId: selectedAttraction !== "ALL" ? selectedAttraction : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: selectedPassStatus !== "ALL" ? selectedPassStatus : undefined,
  };
  const {
    data: passesResponse,
    isLoading: isPassesLoading,
  } = useComplimentaryPassList(passQueryParams);

  const passes = passesResponse?.items ?? [];
  const passPagination = passesResponse?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };

  // References query
  const refQueryParams = {
    page: refPage,
    limit: PAGE_SIZE,
    search: debouncedRefSearch || undefined,
  };
  const {
    data: referencesResponse,
    isLoading: isReferencesLoading,
  } = useReferenceList(refQueryParams);

  const references = referencesResponse?.items ?? [];
  const refPagination = referencesResponse?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };

  // All references for dropdown selection in Complimentary Pass form
  const { data: allRefsResponse } = useReferenceList({ page: 1, limit: 100 });
  const allReferences = allRefsResponse?.items ?? references;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createPassMutation = useCreateComplimentaryPass();
  const updatePassMutation = useUpdateComplimentaryPass();
  const deletePassMutation = useDeleteComplimentaryPass();

  const createRefMutation = useCreateReference();
  const updateRefMutation = useUpdateReference();
  const deleteRefMutation = useDeleteReference();

  // ── Pass Handlers ──────────────────────────────────────────────────────────
  const handleSavePass = async (payload: ComplimentaryPassPayload) => {
    if (passToEdit) {
      await updatePassMutation.mutateAsync({ id: passToEdit.id, payload });
    } else {
      await createPassMutation.mutateAsync(payload);
    }
    setIsPassModalOpen(false);
    setPassToEdit(null);
  };

  const handleDeletePass = async (pass: ComplimentaryPass) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    const confirmed = await confirmDelete(`complimentary pass for "${pass.visitorName}"`);
    if (!confirmed) return;
    deletePassMutation.mutate(pass.id);
  };

  const handleResetPassFilters = () => {
    setPassSearch("");
    setSelectedAttraction("ALL");
    setSelectedPassStatus("ALL");
    setFromDate("");
    setToDate("");
    setPassPage(1);
  };

  const isPassFiltered =
    !!debouncedPassSearch ||
    selectedAttraction !== "ALL" ||
    selectedPassStatus !== "ALL" ||
    !!fromDate ||
    !!toDate;

  // ── Reference Handlers ─────────────────────────────────────────────────────
  const handleSaveRef = async (payload: ReferencePayload) => {
    if (refToEdit) {
      await updateRefMutation.mutateAsync({ id: refToEdit.id, payload });
    } else {
      await createRefMutation.mutateAsync(payload);
    }
    setIsRefModalOpen(false);
    setRefToEdit(null);
  };

  const handleDeleteRef = async (refItem: Reference) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    const confirmed = await confirmDelete(`reference "${refItem.referenceName}"`);
    if (!confirmed) return;
    deleteRefMutation.mutate(refItem.id);
  };

  const handleResetRefFilters = () => {
    setRefSearch("");
    setRefPage(1);
  };

  const isRefFiltered = !!debouncedRefSearch;

  const [isExportingPassesPDF, setIsExportingPassesPDF] = useState(false);
  const [isExportingPassesExcel, setIsExportingPassesExcel] = useState(false);
  const [isExportingRefsPDF, setIsExportingRefsPDF] = useState(false);
  const [isExportingRefsExcel, setIsExportingRefsExcel] = useState(false);

  // ── Export Handlers: Complimentary Passes ─────────────────────────────────
  const getPassesFilterInfo = () => {
    const parts = [
      debouncedPassSearch ? `Search: "${debouncedPassSearch}"` : null,
      selectedAttraction !== "ALL" ? `Attraction: ${selectedAttraction}` : null,
      selectedPassStatus !== "ALL" ? `Status: ${selectedPassStatus}` : null,
      fromDate ? `Date: ${fromDate} → ${toDate || "Now"}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" | ") : undefined;
  };

  const getPassesExportParams = (scope: ExportScope): ComplimentaryPassListParams => {
    const base: ComplimentaryPassListParams = {
      search: debouncedPassSearch || undefined,
      attractionId: selectedAttraction !== "ALL" ? selectedAttraction : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      status: selectedPassStatus !== "ALL" ? selectedPassStatus : undefined,
    };
    return scope === "all" ? { ...base, page: 1, limit: 0 } : { ...base, page: passPage, limit: PAGE_SIZE };
  };

  const handleExportPassesPDF = async (scope: ExportScope) => {
    setIsExportingPassesPDF(true);
    try {
      const result = await fetchComplimentaryPassList(getPassesExportParams(scope));
      const items = result.items;
      if (!items.length) {
        showToast("No complimentary passes to export", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${passPage}`;
      await exportTableToPDF<ComplimentaryPass>({
        title: "COMPLIMENTARY PASSES REPORT",
        filterInfo: getPassesFilterInfo(),
        scope,
        currentPage: passPage,
        filename: `Complimentary_Passes_${scopeLabel}_${dateKey}.pdf`,
        orientation: "landscape",
        columns: [
          { header: "#", accessor: (_, idx) => (scope === "all" ? idx + 1 : idx + 1 + (passPage - 1) * PAGE_SIZE), width: "35px" },
          { header: "Pass ID", accessor: (p) => p.passId || p.id },
          { header: "Visitor Name", accessor: (p) => p.visitorName || "-" },
          { header: "Mobile", accessor: (p) => p.mobile || "-" },
          { header: "Attraction", accessor: (p) => p.attractionName || "-" },
          { header: "Visitors", accessor: (p) => p.visitors || 1, align: "center" },
          { header: "Reference", accessor: (p) => p.referenceName || "-" },
          { header: "Visit Date", accessor: (p) => formatDate(p.visitDate) },
          { header: "Status", renderCell: (p) => renderStatusBadgeHTML(p.status || "ACTIVE"), align: "center" },
        ],
        data: items,
        summaryCards: [
          { label: "Total Passes", value: items.length },
          { label: "Total Visitors", value: items.reduce((s, p) => s + (Number(p.visitors) || 1), 0) },
        ],
      });
      showToast(`PDF downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Passes PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setIsExportingPassesPDF(false);
    }
  };

  const handleExportPassesExcel = async (scope: ExportScope) => {
    setIsExportingPassesExcel(true);
    try {
      const result = await fetchComplimentaryPassList(getPassesExportParams(scope));
      const items = result.items;
      if (!items.length) {
        showToast("No complimentary passes to export", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${passPage}`;
      const headers = ["S.No", "Pass ID", "Visitor Name", "Mobile", "Attraction", "Visitors", "Reference", "Visit Date", "Status"];
      const rows = items.map((p, idx) => [
        scope === "all" ? idx + 1 : idx + 1 + (passPage - 1) * PAGE_SIZE,
        p.passId || p.id,
        p.visitorName || "-",
        p.mobile || "-",
        p.attractionName || "-",
        p.visitors || 1,
        p.referenceName || "-",
        formatDate(p.visitDate),
        p.status || "ACTIVE",
      ]);
      exportToCSV(`Complimentary_Passes_${scopeLabel}_${dateKey}`, headers, rows);
      showToast(`Excel downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Passes Excel export error:", err);
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setIsExportingPassesExcel(false);
    }
  };

  // ── Export Handlers: Reference Management ─────────────────────────────────
  const getRefsFilterInfo = () => {
    return isRefFiltered ? `Search: "${debouncedRefSearch}"` : undefined;
  };

  const getRefsExportParams = (scope: ExportScope): ReferenceListParams => {
    const base: ReferenceListParams = {
      search: debouncedRefSearch || undefined,
    };
    return scope === "all" ? { ...base, page: 1, limit: 0 } : { ...base, page: refPage, limit: PAGE_SIZE };
  };

  const handleExportRefsPDF = async (scope: ExportScope) => {
    setIsExportingRefsPDF(true);
    try {
      const result = await fetchReferenceList(getRefsExportParams(scope));
      const items = result.items;
      if (!items.length) {
        showToast("No references to export", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${refPage}`;
      await exportTableToPDF<Reference>({
        title: "REFERENCE MASTER REPORT",
        filterInfo: getRefsFilterInfo(),
        scope,
        currentPage: refPage,
        filename: `References_Master_${scopeLabel}_${dateKey}.pdf`,
        orientation: "landscape",
        columns: [
          { header: "#", accessor: (_, idx) => (scope === "all" ? idx + 1 : idx + 1 + (refPage - 1) * PAGE_SIZE), width: "35px" },
          { header: "Reference Name", accessor: (r) => r.referenceName || "-" },
          { header: "Department / Organization", accessor: (r) => r.department || "-" },
          { header: "Contact Person", accessor: (r) => r.contactPerson || "-" },
          { header: "Post / Designation", accessor: (r) => r.post || "-" },
          { header: "Mobile", accessor: (r) => r.mobile || "-" },
          { header: "Status", renderCell: (r) => renderStatusBadgeHTML(r.status || "ACTIVE"), align: "center" },
        ],
        data: items,
        summaryCards: [
          { label: "Total References", value: items.length },
        ],
      });
      showToast(`PDF downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Refs PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setIsExportingRefsPDF(false);
    }
  };

  const handleExportRefsExcel = async (scope: ExportScope) => {
    setIsExportingRefsExcel(true);
    try {
      const result = await fetchReferenceList(getRefsExportParams(scope));
      const items = result.items;
      if (!items.length) {
        showToast("No references to export", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${refPage}`;
      const headers = ["S.No", "Reference Name", "Department / Organization", "Contact Person", "Post / Designation", "Mobile", "Status"];
      const rows = items.map((r, idx) => [
        scope === "all" ? idx + 1 : idx + 1 + (refPage - 1) * PAGE_SIZE,
        r.referenceName || "-",
        r.department || "-",
        r.contactPerson || "-",
        r.post || "-",
        r.mobile || "-",
        r.status || "ACTIVE",
      ]);
      exportToCSV(`References_Master_${scopeLabel}_${dateKey}`, headers, rows);
      showToast(`Excel downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Refs Excel export error:", err);
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setIsExportingRefsExcel(false);
    }
  };

  // ── Columns for Passes Table ───────────────────────────────────────────────
  const passColumns: GlobalColumn<ComplimentaryPass>[] = [
    {
      header: "Pass ID",
      cell: (item) => (
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontWeight: 600,
            fontSize: "13px",
            color: colors.brand.accent,
          }}
        >
          {item.passId || item.id}
        </span>
      ),
    },
    {
      header: "Visitor Name",
      cell: (item) => (
        <span style={{ fontWeight: 600, color: "#0C2A42" }}>
          {item.visitorName || "-"}
        </span>
      ),
    },
    {
      header: "Mobile",
      cell: (item) => item.mobile || "-",
    },
    {
      header: "Attraction",
      cell: (item) => item.attractionName || item.attraction || "-",
    },
    {
      header: "No. of Visitors",
      align: "center",
      cell: (item) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "28px",
            height: "24px",
            padding: "0 8px",
            background: "#F1F5F9",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "12px",
            color: "#0C2A42",
          }}
        >
          {item.visitors ?? 1}
        </span>
      ),
    },
    {
      header: "Reference",
      cell: (item) => item.referenceName || item.reference || "-",
    },
    {
      header: "Visit Date",
      cell: (item) => formatDate(item.visitDate || item.date),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Actions",
      align: "center",
      cell: (item, idx) => {
        const itemId = item.id || `pass-${idx}`;
        const isDropdownOpen = activeDropdownId === itemId;

        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDropdownOpen) {
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                } else {
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  const MENU_HEIGHT = 80;
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const openUp = spaceBelow < MENU_HEIGHT + 16;
                  setDropdownPos({
                    top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
                    right: window.innerWidth - rect.right,
                  });
                  setActiveDropdownId(itemId);
                }
              }}
              aria-label="Actions menu"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#374151",
              }}
            >
              <MoreVertical size={18} />
            </button>

            {isDropdownOpen && dropdownPos && (
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                  zIndex: 9999,
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  width: "140px",
                  padding: "4px 0",
                  display: "flex",
                  flexDirection: "column",
                  animation: "fadeIn 0.12s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    setPassToEdit(item);
                    setIsPassModalOpen(true);
                  }}
                  className="dropdown-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                    color: "#374151",
                    textAlign: "left",
                  }}
                >
                  <Edit2 size={14} color="#F4BC43" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDeletePass(item)}
                  className="dropdown-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                    color: "#DC2626",
                    textAlign: "left",
                  }}
                >
                  <Trash2 size={14} color="#DC2626" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // ── Columns for References Table ───────────────────────────────────────────
  const refColumns: GlobalColumn<Reference>[] = [
    {
      header: "Reference Name",
      cell: (item) => (
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontWeight: 700,
            fontSize: "13px",
            color: "#0C2A42",
          }}
        >
          {item.referenceName || "-"}
        </span>
      ),
    },
    {
      header: "Department / Organization",
      cell: (item) => item.department || "-",
    },
    {
      header: "Contact Person",
      cell: (item) => (
        <span style={{ fontWeight: 600, color: "#011B2F" }}>
          {item.contactPerson || "-"}
        </span>
      ),
    },
    {
      header: "Post / Designation",
      cell: (item) => item.post || "-",
    },
    {
      header: "Mobile",
      cell: (item) => item.mobile || "-",
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Actions",
      align: "center",
      cell: (item, idx) => {
        const itemId = item.id || `ref-${idx}`;
        const isDropdownOpen = activeDropdownId === itemId;

        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDropdownOpen) {
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                } else {
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  const MENU_HEIGHT = 80;
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const openUp = spaceBelow < MENU_HEIGHT + 16;
                  setDropdownPos({
                    top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
                    right: window.innerWidth - rect.right,
                  });
                  setActiveDropdownId(itemId);
                }
              }}
              aria-label="Actions menu"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#374151",
              }}
            >
              <MoreVertical size={18} />
            </button>

            {isDropdownOpen && dropdownPos && (
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                  zIndex: 9999,
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  width: "140px",
                  padding: "4px 0",
                  display: "flex",
                  flexDirection: "column",
                  animation: "fadeIn 0.12s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setActiveDropdownId(null);
                    setRefToEdit(item);
                    setIsRefModalOpen(true);
                  }}
                  className="dropdown-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                    color: "#374151",
                    textAlign: "left",
                  }}
                >
                  <Edit2 size={14} color="#F4BC43" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDeleteRef(item)}
                  className="dropdown-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                    color: "#DC2626",
                    textAlign: "left",
                  }}
                >
                  <Trash2 size={14} color="#DC2626" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* ── Top Export & Action Row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Tab Switcher */}
        <div
          style={{
            display: "inline-flex",
            background: "#F1F5F9",
            borderRadius: "10px",
            padding: "4px",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("passes")}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: typography.fontFamily.sans,
              cursor: "pointer",
              background: activeTab === "passes" ? "#011B2F" : "transparent",
              color: activeTab === "passes" ? "#FFFFFF" : "#64748B",
              transition: "all 0.18s ease",
            }}
          >
            Complimentary Passes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("references")}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: typography.fontFamily.sans,
              cursor: "pointer",
              background: activeTab === "references" ? "#011B2F" : "transparent",
              color: activeTab === "references" ? "#FFFFFF" : "#64748B",
              transition: "all 0.18s ease",
            }}
          >
            Reference Management
          </button>
        </div>

        {/* Right Actions: Export + Add Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {activeTab === "passes" ? (
            <>
              <ExportButtons
                onExportPDFScope={handleExportPassesPDF}
                onExportExcelScope={handleExportPassesExcel}
                isExportingPDF={isExportingPassesPDF}
                isExportingExcel={isExportingPassesExcel}
                disabled={isPassesLoading || (passes.length === 0 && (passesResponse?.pagination?.total ?? 0) === 0)}
              />
              <button
                type="button"
                onClick={() => {
                  setPassToEdit(null);
                  setIsPassModalOpen(true);
                }}
                style={{
                  height: "38px",
                  padding: "0 18px",
                  background: "#F4BC43",
                  border: "none",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#011B2F",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(244,188,67,0.3)",
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Issue Pass</span>
              </button>
            </>
          ) : (
            <>
              <ExportButtons
                onExportPDFScope={handleExportRefsPDF}
                onExportExcelScope={handleExportRefsExcel}
                isExportingPDF={isExportingRefsPDF}
                isExportingExcel={isExportingRefsExcel}
                disabled={isReferencesLoading || (references.length === 0 && (referencesResponse?.pagination?.total ?? 0) === 0)}
              />
              <button
                type="button"
                onClick={() => {
                  setRefToEdit(null);
                  setIsRefModalOpen(true);
                }}
                style={{
                  height: "38px",
                  padding: "0 18px",
                  background: "#F4BC43",
                  border: "none",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#011B2F",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(244,188,67,0.3)",
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Add Reference</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${colors.header.border}`,
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {activeTab === "passes" ? (
          <>
            {/* Passes Search Input */}
            <div
              style={{
                position: "relative",
                flex: "1 1 200px",
                minWidth: "180px",
              }}
            >
              <Search
                size={16}
                color="#64748B"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Search visitor name, mobile, reference..."
                value={passSearch}
                onChange={(e) => setPassSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(179, 175, 175, 0.4)",
                  fontSize: "13px",
                  fontFamily: typography.fontFamily.sans,
                  color: "#011B2F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Attraction Dropdown */}
            <select
              value={selectedAttraction}
              onChange={(e) => setSelectedAttraction(e.target.value)}
              style={{
                height: "38px",
                padding: "0 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.4)",
                fontSize: "13px",
                fontFamily: typography.fontFamily.sans,
                color: "#011B2F",
                background: "#FFFFFF",
                cursor: "pointer",
                outline: "none",
                minWidth: "160px",
              }}
            >
              <option value="ALL">All Attractions</option>
              {attractionOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Date Range Picker */}
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onClear={() => { setFromDate(""); setToDate(""); }}
            />

            {/* Pass Status Dropdown */}
            <select
              value={selectedPassStatus}
              onChange={(e) => setSelectedPassStatus(e.target.value)}
              style={{
                height: "38px",
                padding: "0 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.4)",
                fontSize: "13px",
                fontFamily: typography.fontFamily.sans,
                color: "#011B2F",
                background: "#FFFFFF",
                cursor: "pointer",
                outline: "none",
                minWidth: "130px",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="USED">Used</option>
              <option value="EXPIRED">Expired</option>
            </select>

            {/* Reset Button */}
            {isPassFiltered && (
              <button
                type="button"
                onClick={handleResetPassFilters}
                style={{
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  color: "#64748B",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}
          </>
        ) : (
          <>
            {/* References Search Input */}
            <div
              style={{
                position: "relative",
                flex: "1 1 300px",
                minWidth: "220px",
              }}
            >
              <Search
                size={16}
                color="#64748B"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Search reference name, contact person, department, mobile..."
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(179, 175, 175, 0.4)",
                  fontSize: "13px",
                  fontFamily: typography.fontFamily.sans,
                  color: "#011B2F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Reset Button */}
            {isRefFiltered && (
              <button
                type="button"
                onClick={handleResetRefFilters}
                style={{
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  color: "#64748B",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Table Section ── */}
      {activeTab === "passes" ? (
        <GlobalDataTable<ComplimentaryPass>
          columns={passColumns}
          data={passes}
          keyExtractor={(item, index) => item.id || `pass-row-${index}`}
          pageSize={PAGE_SIZE}
          currentPage={passPage}
          onPageChange={setPassPage}
          totalItems={passPagination.total}
          totalPages={passPagination.totalPages}
          showSNo={true}
          sNoHeader="S.No"
          itemLabel="complimentary passes"
          isLoading={isPassesLoading}
          emptyIcon={
            isPassFiltered ? (
              <SearchX size={26} color={colors.brand.accent} />
            ) : (
              <Ticket size={26} color={colors.brand.accent} />
            )
          }
          emptyTitle={
            isPassFiltered
              ? "No Matching Complimentary Passes Found"
              : "No Complimentary Passes Found"
          }
          emptyDescription={
            isPassFiltered
              ? debouncedPassSearch.trim()
                ? `No passes found matching "${debouncedPassSearch}". Try adjusting your search or filters.`
                : "No complimentary passes match the selected filter criteria. Try adjusting or clearing your filters."
              : "There are currently no complimentary passes recorded in the system."
          }
          emptyAction={
            isPassFiltered ? (
              <button
                type="button"
                onClick={handleResetPassFilters}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.header.border}`,
                  background: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: colors.brand.accent,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                Clear Filters &amp; Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPassToEdit(null);
                  setIsPassModalOpen(true);
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#F4BC43",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#011B2F",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(244,188,67,0.3)",
                }}
              >
                Issue First Complimentary Pass
              </button>
            )
          }
        />
      ) : (
        <GlobalDataTable<Reference>
          columns={refColumns}
          data={references}
          keyExtractor={(item, index) => item.id || `ref-row-${index}`}
          pageSize={PAGE_SIZE}
          currentPage={refPage}
          onPageChange={setRefPage}
          totalItems={refPagination.total}
          totalPages={refPagination.totalPages}
          showSNo={true}
          sNoHeader="S.No"
          itemLabel="references"
          isLoading={isReferencesLoading}
          emptyIcon={
            isRefFiltered ? (
              <SearchX size={26} color={colors.brand.accent} />
            ) : (
              <Users size={26} color={colors.brand.accent} />
            )
          }
          emptyTitle={
            isRefFiltered ? "No Matching References Found" : "No References Found"
          }
          emptyDescription={
            isRefFiltered
              ? `No references found matching "${debouncedRefSearch}". Try adjusting your search query.`
              : "There are currently no references recorded in the master list."
          }
          emptyAction={
            isRefFiltered ? (
              <button
                type="button"
                onClick={handleResetRefFilters}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.header.border}`,
                  background: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: colors.brand.accent,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRefToEdit(null);
                  setIsRefModalOpen(true);
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#F4BC43",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#011B2F",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(244,188,67,0.3)",
                }}
              >
                Add First Reference
              </button>
            )
          }
        />
      )}

      {/* ── Issue / Edit Pass Modal ── */}
      <IssueComplimentaryPassModal
        isOpen={isPassModalOpen}
        onClose={() => {
          setIsPassModalOpen(false);
          setPassToEdit(null);
        }}
        passToEdit={passToEdit}
        references={allReferences}
        attractions={attractionOptions}
        onSave={handleSavePass}
        isSaving={createPassMutation.isPending || updatePassMutation.isPending}
      />

      {/* ── Add / Edit Reference Modal ── */}
      <AddReferenceModal
        isOpen={isRefModalOpen}
        onClose={() => {
          setIsRefModalOpen(false);
          setRefToEdit(null);
        }}
        refToEdit={refToEdit}
        onSave={handleSaveRef}
        isSaving={createRefMutation.isPending || updateRefMutation.isPending}
      />

      <style>{`
        .dropdown-item:hover { background: #F1F5F9 !important; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
