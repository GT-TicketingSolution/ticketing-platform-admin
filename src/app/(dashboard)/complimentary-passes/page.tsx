"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Edit2,
  Trash2,
} from "lucide-react";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";
import { confirmDelete } from "@/lib/notify";
import { useToast } from "@/components/ui/Toast";
import { exportToCSV } from "@/lib/exportUtils";
import {
  handleDownloadComplimentaryPassesPDF,
  handleDownloadReferencesPDF,
} from "@/lib/printUtils";
import DateRangePicker from "@/components/ui/DateRangePicker";
import {
  ComplimentaryPass,
  Reference,
  ATTRACTIONS,
} from "@/types/complimentaryPass";
import IssueComplimentaryPassModal from "@/components/modals/IssueComplimentaryPassModal";
import AddReferenceModal from "@/components/modals/AddReferenceModal";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PASSES: ComplimentaryPass[] = [
  { id: "1", passId: "CP-2026-01", visitorName: "Amit Sharma", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 2, reference: "MLA Office", status: "Active", date: "2026-01-15" },
  { id: "2", passId: "CP-2026-02", visitorName: "Rahul Verma", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 5, reference: "Tourism dept.", status: "Active", date: "2026-01-16" },
  { id: "3", passId: "CP-2026-03", visitorName: "Priya Singh", mobile: "+91 8768756478", attraction: "Ropeway", visitors: 8, reference: "Collector Office", status: "Used", date: "2026-01-17" },
  { id: "4", passId: "CP-2026-04", visitorName: "Neha Jain", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 4, reference: "Friend", status: "Active", date: "2026-01-18" },
  { id: "5", passId: "CP-2026-05", visitorName: "Karan Mehta", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 2, reference: "Friend", status: "Active", date: "2026-01-19" },
  { id: "6", passId: "CP-2026-06", visitorName: "Anjali Gupta", mobile: "+91 8768756478", attraction: "Wax Mueseum", visitors: 3, reference: "Friend", status: "Active", date: "2026-01-20" },
  { id: "7", passId: "CP-2026-07", visitorName: "Mohit Arora", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 3, reference: "MLA Office", status: "Expired", date: "2026-01-21" },
  { id: "8", passId: "CP-2026-08", visitorName: "Sneha Kapoor", mobile: "+91 8768756478", attraction: "Ropeway", visitors: 2, reference: "Tourism dept.", status: "Active", date: "2026-01-22" },
  { id: "9", passId: "CP-2026-09", visitorName: "Vivek Joshi", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 2, reference: "Collector Office", status: "Used", date: "2026-01-23" },
  { id: "10", passId: "CP-2026-10", visitorName: "Pooja Sharma", mobile: "+91 8768756478", attraction: "Wax Mueseum", visitors: 2, reference: "Friend", status: "Active", date: "2026-01-24" },
  { id: "11", passId: "CP-2026-11", visitorName: "Ravi Kumar", mobile: "+91 8768756478", attraction: "Toy Train", visitors: 3, reference: "MLA Office", status: "Active", date: "2026-01-25" },
  { id: "12", passId: "CP-2026-12", visitorName: "Sunita Rao", mobile: "+91 8768756478", attraction: "Ropeway", visitors: 4, reference: "Tourism dept.", status: "Active", date: "2026-01-26" },
  { id: "13", passId: "CP-2026-13", visitorName: "Deepak Singh", mobile: "+91 8768756478", attraction: "Wax Mueseum", visitors: 2, reference: "Friend", status: "Active", date: "2026-01-27" },
];

const INITIAL_REFERENCES: Reference[] = [
  { id: "1", referenceName: "MLA Office", department: "Government", contactPerson: "Amit Sharma", post: "MLA", mobile: "+91 8768756478", status: "Active" },
  { id: "2", referenceName: "Tourism dept.", department: "Government", contactPerson: "Rahul Verma", post: "Director", mobile: "+91 8768756478", status: "Active" },
  { id: "3", referenceName: "Collector Office", department: "Government", contactPerson: "Priya Singh", post: "Collector", mobile: "+91 8768756478", status: "Active" },
  { id: "4", referenceName: "Friend", department: "Personal", contactPerson: "Neha Jain", post: "—", mobile: "+91 8768756478", status: "Active" },
  { id: "5", referenceName: "Friend", department: "Personal", contactPerson: "Karan Mehta", post: "—", mobile: "+91 8768756478", status: "Inactive" },
  { id: "6", referenceName: "Friend", department: "Personal", contactPerson: "Anjali Gupta", post: "—", mobile: "+91 8768756478", status: "Active" },
  { id: "7", referenceName: "MLA Office", department: "Government", contactPerson: "Mohit Arora", post: "MLA", mobile: "+91 8768756478", status: "Active" },
  { id: "8", referenceName: "Tourism dept.", department: "Government", contactPerson: "Sneha Kapoor", post: "Manager", mobile: "+91 8768756478", status: "Active" },
  { id: "9", referenceName: "Collector Office", department: "Government", contactPerson: "Vivek Joshi", post: "Deputy Collector", mobile: "+91 8768756478", status: "Active" },
  { id: "10", referenceName: "Friend", department: "Personal", contactPerson: "Pooja Sharma", post: "—", mobile: "+91 8768756478", status: "Inactive" },
  { id: "11", referenceName: "MLA Office", department: "Government", contactPerson: "Ravi Kumar", post: "Assistant", mobile: "+91 8768756478", status: "Active" },
  { id: "12", referenceName: "Tourism dept.", department: "Government", contactPerson: "Sunita Rao", post: "Officer", mobile: "+91 8768756478", status: "Active" },
  { id: "13", referenceName: "Friend", department: "Personal", contactPerson: "Deepak Singh", post: "—", mobile: "+91 8768756478", status: "Active" },
];

// ─── Action Dropdown matching Bookings ────────────────────────────────────────

interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

function ActionMenu({ onEdit, onDelete, editLabel = "Edit", deleteLabel = "Delete" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
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

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "32px",
            zIndex: 100,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            width: "140px",
            padding: "4px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: "#374151",
              textAlign: "left",
            }}
          >
            <Edit2 size={14} color="#F4BC43" />
            <span>{editLabel}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: "#DC2626",
              textAlign: "left",
            }}
          >
            <Trash2 size={14} color="#DC2626" />
            <span>{deleteLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Attraction Dropdown ──────────────────────────────────────────────────────

interface AttractionDropdownProps {
  value: string;
  onChange: (v: string) => void;
}

function AttractionDropdown({ value, onChange }: AttractionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          fontSize: "11px",
          color: "rgba(81, 82, 82, 0.75)",
          lineHeight: "14px",
          display: "block",
        }}
      >
        Attraction
      </label>
      <div
        style={{
          position: "relative",
          width: "184px",
          height: "40px",
          background: "#FFFFFF",
          border: "0.5px solid #B3AFAF",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          cursor: "pointer",
          boxSizing: "border-box",
          justifyContent: "space-between",
        }}
        onClick={() => setOpen((p) => !p)}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            fontSize: "12px",
            color: "#173F63",
          }}
        >
          {value || "All Attractions"}
        </span>
        <ChevronDown
          size={16}
          color="#173F63"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />

        {open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#FFFFFF",
              border: "0.5px solid #B3AFAF",
              borderRadius: "4px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 999,
              marginTop: "2px",
            }}
          >
            {ATTRACTIONS.map((a) => (
              <div
                key={a}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(a);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "12px",
                  color: "#173F63",
                  cursor: "pointer",
                  background: a === value ? "#F0F7FF" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (a !== value) e.currentTarget.style.background = "#F9FAFB";
                }}
                onMouseLeave={(e) => {
                  if (a !== value) e.currentTarget.style.background = "transparent";
                }}
              >
                {a}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = "issued" | "reference";

export default function ComplimentaryPassesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("issued");
  const [passes, setPasses] = useState<ComplimentaryPass[]>(INITIAL_PASSES);
  const [refs, setRefs] = useState<Reference[]>(INITIAL_REFERENCES);
  const [searchTerm, setSearchTerm] = useState("");
  const [attractionFilter, setAttractionFilter] = useState("All Attractions");

  // Date Range Picker state (from / to dates)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [passToEdit, setPassToEdit] = useState<ComplimentaryPass | null>(null);
  const [addRefModalOpen, setAddRefModalOpen] = useState(false);
  const [refToEdit, setRefToEdit] = useState<Reference | null>(null);

  const { showToast } = useToast();
  const resetPage = () => setCurrentPage(1);

  // ── Filtered Passes ──
  const filteredPasses = useMemo(() => {
    let data = passes;
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      data = data.filter(
        (p) =>
          p.visitorName.toLowerCase().includes(t) ||
          p.mobile.toLowerCase().includes(t) ||
          p.passId.toLowerCase().includes(t) ||
          p.reference.toLowerCase().includes(t)
      );
    }
    if (attractionFilter && attractionFilter !== "All Attractions") {
      data = data.filter((p) => p.attraction === attractionFilter);
    }

    // Date range filter on pass date
    if (fromDate) {
      data = data.filter((p) => p.date >= fromDate);
    }
    if (toDate) {
      data = data.filter((p) => p.date <= toDate);
    }

    return data;
  }, [passes, searchTerm, attractionFilter, fromDate, toDate]);

  // ── Filtered References ──
  const filteredRefs = useMemo(() => {
    let data = refs;
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.referenceName.toLowerCase().includes(t) ||
          r.contactPerson.toLowerCase().includes(t) ||
          r.mobile.toLowerCase().includes(t)
      );
    }
    return data;
  }, [refs, searchTerm]);

  // ── Pass handlers ──
  const handleSavePass = (data: Omit<ComplimentaryPass, "id" | "passId">) => {
    if (passToEdit) {
      setPasses((prev) =>
        prev.map((p) => (p.id === passToEdit.id ? { ...p, ...data } : p))
      );
      showToast("Complimentary pass updated successfully!", "success");
    } else {
      const newPass: ComplimentaryPass = {
        id: Date.now().toString(),
        passId: `CP-2026-${String(passes.length + 1).padStart(2, "0")}`,
        ...data,
      };
      setPasses((prev) => [...prev, newPass]);
      showToast("Complimentary pass issued successfully!", "success");
    }
    setPassToEdit(null);
  };

  const handleEditPass = (pass: ComplimentaryPass) => {
    setPassToEdit(pass);
    setIssueModalOpen(true);
  };

  const handleDeletePass = async (pass: ComplimentaryPass) => {
    const confirmed = await confirmDelete(`pass "${pass.passId}"`);
    if (!confirmed) return;
    setPasses((prev) => prev.filter((p) => p.id !== pass.id));
    showToast(`Pass "${pass.passId}" has been deleted.`, "info");
  };

  // ── Reference handlers ──
  const handleSaveRef = (data: Omit<Reference, "id">) => {
    if (refToEdit) {
      setRefs((prev) =>
        prev.map((r) => (r.id === refToEdit.id ? { ...r, ...data } : r))
      );
      showToast("Reference updated successfully!", "success");
    } else {
      const newRef: Reference = { id: Date.now().toString(), ...data };
      setRefs((prev) => [...prev, newRef]);
      showToast("Reference added successfully!", "success");
    }
    setRefToEdit(null);
  };

  const handleEditRef = (ref: Reference) => {
    setRefToEdit(ref);
    setAddRefModalOpen(true);
  };

  const handleDeleteRef = async (ref: Reference) => {
    const confirmed = await confirmDelete(`reference "${ref.referenceName}"`);
    if (!confirmed) return;
    setRefs((prev) => prev.filter((r) => r.id !== ref.id));
    showToast(`Reference "${ref.referenceName}" has been deleted.`, "info");
  };

  // ── Export helpers ──
  const handleExportPassesCSV = () => {
    const headers = [
      "Pass ID",
      "Visitor Name",
      "Mobile No.",
      "Attraction",
      "Visitors",
      "Reference",
      "Status",
      "Date",
    ];
    const rows = filteredPasses.map((p) => [
      p.passId,
      p.visitorName,
      p.mobile,
      p.attraction,
      p.visitors,
      p.reference,
      p.status,
      p.date,
    ]);
    exportToCSV("Complimentary_Passes", headers, rows);
    showToast("Passes exported to Excel (CSV)!", "success");
  };

  const handleExportPassesPDF = () => {
    const filterInfo = `Attraction: ${attractionFilter}${
      fromDate ? `, From: ${fromDate}` : ""
    }${toDate ? `, To: ${toDate}` : ""}`;

    handleDownloadComplimentaryPassesPDF(filteredPasses, filterInfo);
    showToast("Downloading Complimentary Passes PDF...", "success");
  };

  const handleExportRefsCSV = () => {
    const headers = [
      "Reference Name",
      "Department",
      "Contact Person",
      "Post/Designation",
      "Mobile No.",
      "Status",
    ];
    const rows = filteredRefs.map((r) => [
      r.referenceName,
      r.department,
      r.contactPerson,
      r.post,
      r.mobile,
      r.status,
    ]);
    exportToCSV("Reference_Management", headers, rows);
    showToast("References exported to Excel (CSV)!", "success");
  };

  const handleExportRefsPDF = () => {
    handleDownloadReferencesPDF(filteredRefs, "All References");
    showToast("Downloading Reference Management PDF...", "success");
  };

  // ── Table Columns ──
  const passColumns: GlobalColumn<ComplimentaryPass>[] = [
    { header: "Pass ID", accessorKey: "passId", width: "110px" },
    { header: "Visitor Name", accessorKey: "visitorName" },
    { header: "Mobile No.", accessorKey: "mobile" },
    { header: "Attraction", accessorKey: "attraction" },
    { header: "Visitors", accessorKey: "visitors", align: "center", width: "80px" },
    { header: "Reference", accessorKey: "reference" },
    {
      header: "Actions",
      align: "center",
      width: "80px",
      cell: (item) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ActionMenu
            onEdit={() => handleEditPass(item)}
            onDelete={() => handleDeletePass(item)}
          />
        </div>
      ),
    },
  ];

  const refColumns: GlobalColumn<Reference>[] = [
    { header: "Reference Name", accessorKey: "referenceName" },
    { header: "Contact Person", accessorKey: "contactPerson" },
    { header: "Mobile No.", accessorKey: "mobile" },
    {
      header: "Actions",
      align: "center",
      width: "80px",
      cell: (item) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ActionMenu
            onEdit={() => handleEditRef(item)}
            onDelete={() => handleDeleteRef(item)}
          />
        </div>
      ),
    },
  ];

  const searchPlaceholder =
    activeTab === "issued"
      ? "Search by Visitor Name, Mobile No., Reference........"
      : "Search by Reference Name or Contact Person........";

  const handleReset = () => {
    setSearchTerm("");
    setAttractionFilter("All Attractions");
    setFromDate("");
    setToDate("");
    resetPage();
  };

  const exportBtnStyle: React.CSSProperties = {
    height: "39px",
    padding: "0 18px",
    background: "#FFFFFF",
    border: "1px solid rgba(0,0,0,0.41)",
    borderRadius: "5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 500,
    fontSize: "12px",
    color: "#173F63",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  const primaryBtnStyle: React.CSSProperties = {
    height: "39px",
    padding: "0 20px",
    background: "#0C2A42",
    border: "none",
    borderRadius: "5px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: "12px",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(12,42,66,0.2)",
    transition: "all 0.2s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* ── Row 1: Tabs left | Export + Primary action right (matches Bookings) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {(["issued", "reference"] as ActiveTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  resetPage();
                  setSearchTerm("");
                }}
                style={{
                  height: "41px",
                  padding: "0 22px",
                  background: isActive ? "#F4BC43" : "#FFFFFF",
                  border: isActive ? "1.5px solid #0C2A42" : "1.5px solid #CBD5E1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: isActive ? "#0C2A42" : "#64748B",
                  boxShadow: isActive ? "0 2px 8px rgba(244, 188, 67, 0.25)" : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "#94A3B8";
                    e.currentTarget.style.background = "#F8FAFC";
                    e.currentTarget.style.color = "#0C2A42";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "#CBD5E1";
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.color = "#64748B";
                  }
                }}
              >
                {tab === "issued" ? "Issued Passes" : "Reference Management"}
              </button>
            );
          })}
        </div>

        {/* Export + Primary action (right-aligned) */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={activeTab === "issued" ? handleExportPassesPDF : handleExportRefsPDF}
            style={exportBtnStyle}
          >
            <FileText size={16} color="#173F63" />
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            onClick={activeTab === "issued" ? handleExportPassesCSV : handleExportRefsCSV}
            style={exportBtnStyle}
          >
            <FileSpreadsheet size={16} color="#107C41" />
            <span>Export Excel</span>
          </button>

          {activeTab === "issued" ? (
            <button
              type="button"
              onClick={() => {
                setPassToEdit(null);
                setIssueModalOpen(true);
              }}
              style={primaryBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#173F63";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0C2A42";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <span>Issue Complimentary Pass</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRefToEdit(null);
                setAddRefModalOpen(true);
              }}
              style={primaryBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#173F63";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0C2A42";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <span>Add Reference</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: White filter card (identical structure to Bookings/Transactions) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: "#FFFFFF",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid rgba(179, 175, 175, 0.4)",
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              border: "1.5px solid rgba(179, 175, 175, 0.51)",
              borderRadius: "4px",
              padding: "0 12px",
              height: "40px",
              boxSizing: "border-box",
            }}
          >
            <Search size={18} color="#B3AFAF" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                resetPage();
              }}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                color: "#011B2F",
              }}
            />
          </div>
        </div>

        {/* Filters group */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}>
          {/* Attraction */}
          {activeTab === "issued" && (
            <AttractionDropdown
              value={attractionFilter}
              onChange={(v) => {
                setAttractionFilter(v);
                resetPage();
              }}
            />
          )}

          {/* Date Range Picker (from date to to date) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "11px",
                color: "rgba(81, 82, 82, 0.75)",
                lineHeight: "14px",
                display: "block",
              }}
            >
              Date Range
            </label>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onClear={() => {
                setFromDate("");
                setToDate("");
              }}
            />
          </div>

          {/* Reset */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ height: "14px" }} />
            <button
              type="button"
              onClick={handleReset}
              style={{
                height: "40px",
                width: "95px",
                borderRadius: "4px",
                border: "0.5px solid rgba(179, 175, 175, 0.66)",
                background: "#FFFFFF",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "#173F63",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxSizing: "border-box",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 3: Table ── */}
      {activeTab === "issued" ? (
        <GlobalDataTable
          columns={passColumns}
          data={filteredPasses}
          keyExtractor={(item) => item.id}
          pageSize={10}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showSNo={false}
          itemLabel="passes"
          emptyMessage="No complimentary passes found matching current filters."
        />
      ) : (
        <GlobalDataTable
          columns={refColumns}
          data={filteredRefs}
          keyExtractor={(item) => item.id}
          pageSize={10}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showSNo={false}
          itemLabel="references"
          emptyMessage="No references found matching current filters."
        />
      )}

      {/* ── Modals ── */}
      <IssueComplimentaryPassModal
        isOpen={issueModalOpen}
        onClose={() => {
          setIssueModalOpen(false);
          setPassToEdit(null);
        }}
        passToEdit={passToEdit}
        references={refs}
        onSave={handleSavePass}
      />

      <AddReferenceModal
        isOpen={addRefModalOpen}
        onClose={() => {
          setAddRefModalOpen(false);
          setRefToEdit(null);
        }}
        refToEdit={refToEdit}
        onSave={handleSaveRef}
      />
    </div>
  );
}
