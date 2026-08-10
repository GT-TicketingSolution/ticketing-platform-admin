"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusToggle from "@/components/ui/StatusToggle";
import StatusFilterSelect from "@/components/ui/StatusFilterSelect";
import { extractUniqueAttractions, matchesStatusFilter, matchesAttractionFilter } from "@/lib/filterUtils";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Filter,
  Building2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import {
  INITIAL_MANAGERS,
  INITIAL_ATTRACTIONS,
  ManagerUser,
  AttractionPermission,
} from "@/types/admin";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete, confirmAdd, confirmStatusChange, showSuccessNotify } from "@/lib/notify";
import { addManagerSchema, AddManagerFormData } from "./schema";
import { DataTable, Column } from "@/components/ui/DataTable";
import { META_CONSTANTS } from "@/lib/metaConstant";

// Sub-modules available inside each attraction
const SUB_MODULES = [
  "Counter Assignment",
  "Customer Management",
  "Complimentary Passes",
  "User Management",
  "CCTV Monitoring",
];

// System modules available for manager UI permissions
const SYSTEM_MODULES = [
  { id: "Bookings", label: "Bookings", description: "View & manage bookings" },
  { id: "Transactions", label: "Transactions", description: "Financial & payment records" },
  { id: "Reports", label: "Records / Reports", description: "Sales & revenue analytics" },
  { id: "Invoices", label: "Invoices", description: "Tax invoices & billing receipts" },
  { id: "Inventory / Capacity", label: "Inventory / Capacity", description: "Capacity & ticket inventory" },
  { id: "Staff Management", label: "Staff Management", description: "Create & manage counter staff" },
];

function SystemModulePermissionTree({
  selectedModules,
  onChange,
}: {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
}) {
  const allSelected = SYSTEM_MODULES.every((m) => selectedModules.includes(m.id));

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(SYSTEM_MODULES.map((m) => m.id));
    }
  };

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      onChange(selectedModules.filter((m) => m !== id));
    } else {
      onChange([...selectedModules, id]);
    }
  };

  return (
    <div
      style={{
        border: `1.5px solid ${colors.login.inputBorder}`,
        borderRadius: "10px",
        overflow: "hidden",
        fontFamily: typography.fontFamily.sans,
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          background: colors.sidebar.bg,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={15} color={colors.brand.primary} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
            Main System Module Permissions
          </span>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            userSelect: "none",
            fontSize: "12px",
            color: colors.brand.primary,
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            style={{ accentColor: colors.brand.primary, width: "13px", height: "13px" }}
          />
          Select All
        </label>
      </div>

      <div
        style={{
          padding: "12px 16px",
          background: "#FFFFFF",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        {SYSTEM_MODULES.map((mod) => {
          const isChecked = selectedModules.includes(mod.id);
          return (
            <label
              key={mod.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: `1px solid ${isChecked ? "rgba(35,114,165,0.3)" : colors.header.border}`,
                background: isChecked ? "rgba(35,114,165,0.04)" : "#F8FAFC",
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.15s",
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleModule(mod.id)}
                style={{
                  accentColor: colors.brand.accent,
                  width: "14px",
                  height: "14px",
                  marginTop: "2px",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: isChecked ? 700 : 500,
                    color: isChecked ? colors.brand.accent : colors.text.primary,
                  }}
                >
                  {mod.label}
                </div>
                <div style={{ fontSize: "11px", color: colors.text.muted }}>
                  {mod.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

//FieldError
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      style={{
        fontSize: "12px",
        color: colors.status.error,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "4px",
        fontFamily: typography.fontFamily.sans,
      }}
    >
      <AlertCircle size={12} />
      {message}
    </span>
  );
}

// Styled input
const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  height: "40px",
  border: `1.5px solid ${hasError ? colors.status.error : colors.login.inputBorder}`,
  borderRadius: "8px",
  padding: "0 12px",
  marginTop: "4px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: typography.fontFamily.sans,
  transition: "border-color 0.18s",
});



// Helper to derive attraction label from selected permissions
function getAttractionFromPermissions(permissions: AttractionPermission[]): string {
  if (!permissions || permissions.length === 0) return "Main Entrance";
  const names = permissions
    .map((p) => INITIAL_ATTRACTIONS.find((a) => a.id === p.attractionId)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Main Entrance";
}

//Attraction Permission Tree
function AttractionPermissionTree({
  enabled,
  permissions,
  onEnabledChange,
  onPermissionsChange,
}: {
  enabled: boolean;
  permissions: AttractionPermission[];
  onEnabledChange: (v: boolean) => void;
  onPermissionsChange: (p: AttractionPermission[]) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const getPermission = (attractionId: string) =>
    permissions.find((p) => p.attractionId === attractionId);

  const isAttractionSelected = (attractionId: string) =>
    !!getPermission(attractionId);

  const toggleAttraction = (attractionId: string) => {
    const alreadySelected = isAttractionSelected(attractionId);
    if (alreadySelected) {
      onPermissionsChange(permissions.filter((p) => p.attractionId !== attractionId));
      setExpandedIds((prev) => prev.filter((id) => id !== attractionId));
    } else {
      onPermissionsChange([...permissions, { attractionId, modules: [] }]);
      setExpandedIds((prev) => [...prev, attractionId]);
    }
  };

  const toggleSubModule = (attractionId: string, module: string) => {
    onPermissionsChange(
      permissions.map((p) => {
        if (p.attractionId !== attractionId) return p;
        const hasModule = p.modules.includes(module);
        return {
          ...p,
          modules: hasModule ? p.modules.filter((m) => m !== module) : [...p.modules, module],
        };
      })
    );
  };

  const toggleAllSubModules = (attractionId: string, selectAll: boolean) => {
    onPermissionsChange(
      permissions.map((p) =>
        p.attractionId === attractionId
          ? { ...p, modules: selectAll ? [...SUB_MODULES] : [] }
          : p
      )
    );
  };

  const toggleExpand = (attractionId: string) => {
    setExpandedIds((prev) =>
      prev.includes(attractionId)
        ? prev.filter((id) => id !== attractionId)
        : [...prev, attractionId]
    );
  };

  return (
    <div
      style={{
        border: `1.5px solid ${colors.login.inputBorder}`,
        borderRadius: "10px",
        overflow: "hidden",
        fontFamily: typography.fontFamily.sans,
      }}
    >
      {/* Master toggle row */}
      <div
        style={{
          background: colors.sidebar.bg,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            userSelect: "none",
            flex: 1,
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              onEnabledChange(e.target.checked);
              if (!e.target.checked) {
                onPermissionsChange([]);
                setExpandedIds([]);
              }
            }}
            style={{ accentColor: colors.brand.primary, width: "15px", height: "15px" }}
          />
          <Building size={15} color={colors.brand.primary} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
            Attraction Management
          </span>
        </label>
        {enabled && (
          <span
            style={{
              fontSize: "11px",
              color: colors.brand.primary,
              fontWeight: 600,
              background: "rgba(244,188,67,0.15)",
              padding: "2px 8px",
              borderRadius: "6px",
            }}
          >
            {permissions.length} attraction{permissions.length !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {/* Attraction list — only visible when master is on */}
      {enabled && (
        <div style={{ background: "#FFFFFF" }}>
          {INITIAL_ATTRACTIONS.map((attraction, idx) => {
            const selected = isAttractionSelected(attraction.id);
            const expanded = expandedIds.includes(attraction.id);
            const perm = getPermission(attraction.id);
            const allSubsChecked = perm?.modules.length === SUB_MODULES.length;

            return (
              <div
                key={attraction.id}
                style={{
                  borderTop: idx > 0 ? `1px solid ${colors.header.border}` : undefined,
                }}
              >
                {/* Attraction row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    background: selected ? "rgba(35,114,165,0.05)" : "#FFFFFF",
                    transition: "background 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleAttraction(attraction.id)}
                    style={{
                      accentColor: colors.brand.accent,
                      width: "15px",
                      height: "15px",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: selected ? 700 : 500,
                        color: selected ? colors.brand.accent : colors.text.primary,
                      }}
                    >
                      {attraction.name}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.brand.primary, fontWeight: 600 }}>
                      {attraction.category}
                    </div>
                  </div>

                  {selected && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.brand.accent,
                        background: "rgba(35,114,165,0.1)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {perm?.modules.length ?? 0}/{SUB_MODULES.length} modules
                    </span>
                  )}

                  {selected && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(attraction.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        color: colors.text.muted,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>

                {selected && expanded && (
                  <div
                    style={{
                      background: "rgba(35,114,165,0.03)",
                      borderTop: `1px dashed rgba(35,114,165,0.2)`,
                      padding: "10px 16px 10px 44px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        userSelect: "none",
                        paddingBottom: "6px",
                        borderBottom: `1px solid rgba(35,114,165,0.15)`,
                        marginBottom: "4px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allSubsChecked}
                        onChange={(e) => toggleAllSubModules(attraction.id, e.target.checked)}
                        style={{ accentColor: colors.brand.accent, width: "13px", height: "13px" }}
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: colors.brand.accent,
                        }}
                      >
                        Select All Modules
                      </span>
                    </label>

                    {SUB_MODULES.map((mod) => {
                      const modEnabled = perm?.modules.includes(mod) ?? false;
                      return (
                        <label
                          key={mod}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={modEnabled}
                            onChange={() => toggleSubModule(attraction.id, mod)}
                            style={{
                              accentColor: colors.brand.accent,
                              width: "13px",
                              height: "13px",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: modEnabled ? 600 : 400,
                              color: modEnabled ? colors.text.primary : colors.text.muted,
                            }}
                          >
                            {mod}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer summary */}
      <div
        style={{
          padding: "8px 16px",
          background: "#F8FAFC",
          borderTop: `1px solid ${colors.header.border}`,
          fontSize: "12px",
          color: colors.text.muted,
        }}
      >
        {enabled
          ? `${permissions.length} attraction${permissions.length !== 1 ? "s" : ""} with access · ${permissions.reduce((acc, p) => acc + p.modules.length, 0)} total module permissions`
          : "Enable Attraction Management to assign attractions & module access"}
      </div>
    </div>
  );
}

// Page (inner – uses useSearchParams, must be inside Suspense)
function ManagerManagementInner() {
  useEffect(() => {
    document.title = META_CONSTANTS.managerManagement.fullTitle;
  }, []);

  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [managers, setManagers] = useState<ManagerUser[]>(INITIAL_MANAGERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttractionFilter, setSelectedAttractionFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(
    searchParams.get("status") ?? "All"
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ManagerUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<AddManagerFormData>({
    resolver: zodResolver(addManagerSchema) as import("react-hook-form").Resolver<AddManagerFormData>,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      attraction: "",
      status: "Active",
      allowedModules: ["Bookings", "Transactions", "Invoices", "Inventory / Capacity", "Reports", "Staff Management"] as string[],
      attractionManagementEnabled: false,
      attractionPermissions: [] as AttractionPermission[],
    },
  });

  const watchedStatus = useWatch({ control, name: "status", defaultValue: "Active" });
  const watchedEnabled = useWatch({ control, name: "attractionManagementEnabled", defaultValue: false });
  const watchedPermissions = useWatch({ control, name: "attractionPermissions", defaultValue: [] });
  const watchedAllowedModules = useWatch({ control, name: "allowedModules", defaultValue: ["Bookings", "Transactions", "Invoices", "Inventory / Capacity", "Reports", "Staff Management"] });

  // Filter 
  const filteredManagers = managers.filter((m) => {
    const matchesAttraction = matchesAttractionFilter(m.attraction, selectedAttractionFilter);
    const matchesStatus = matchesStatusFilter(m.status, selectedStatusFilter);
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery) ||
      m.attraction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAttraction && matchesStatus && matchesSearch;
  });

  // Add
  const onAddSubmit = async (data: AddManagerFormData) => {
    setIsAddModalOpen(false);
    const confirmed = await confirmAdd(`manager "${data.name}"`);
    if (!confirmed) { setIsAddModalOpen(true); return; }

    const computedAttraction = getAttractionFromPermissions(data.attractionPermissions || []);

    const created: ManagerUser = {
      id: `MGR-10${managers.length + 1}`,
      name: data.name,
      phone: data.phone,
      email: data.email,
      attraction: computedAttraction,
      joinedDate: new Date().toISOString().slice(0, 10),
      status: data.status,
      totalBookings: 0,
      revenueGenerated: 0,
      allowedModules: data.allowedModules || [],
      attractionManagementEnabled: data.attractionManagementEnabled,
      attractionPermissions: data.attractionManagementEnabled ? data.attractionPermissions : [],
    };

    setManagers([created, ...managers]);
    reset();
    showToast(`Manager "${created.name}" added successfully!`, "success");
  };

  // Edit
  const handleSaveEdit = async () => {
    if (!selectedManager) return;
    const computedAttraction = getAttractionFromPermissions(selectedManager.attractionPermissions || []);
    const updated = { ...selectedManager, attraction: computedAttraction };
    setManagers(managers.map((m) => (m.id === updated.id ? updated : m)));
    setSelectedManager(updated);
    setIsEditing(false);
    showToast(`Manager "${updated.name}" updated successfully!`, "success");
  };

  // Delete
  const handleDeleteManager = async (id: string) => {
    const target = managers.find((m) => m.id === id);
    const prev = selectedManager;
    setSelectedManager(null);
    const confirmed = await confirmDelete(`manager "${target?.name ?? id}"`);
    if (!confirmed) { setSelectedManager(prev); return; }
    setManagers(managers.filter((m) => m.id !== id));
    showToast(`Manager "${target?.name ?? id}" has been deleted.`, "info");
  };

  // Status toggle with confirmation
  const handleStatusChangeWithConfirm = async (manager: ManagerUser, newStatus: "Active" | "Inactive") => {
    const confirmed = await confirmStatusChange(manager.name, newStatus);
    if (!confirmed) return;
    const updated = { ...manager, status: newStatus };
    setManagers(managers.map((m) => (m.id === manager.id ? updated : m)));
    if (selectedManager?.id === manager.id) {
      setSelectedManager(updated);
    }
    showToast(`Status of "${manager.name}" updated to "${newStatus}".`, "success");
  };

  // Table columns
  const columns: Column<ManagerUser>[] = [
    {
      header: "Manager Name",
      cell: (manager) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px", height: "34px", borderRadius: "50%",
              background: colors.sidebar.bg, color: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 700, flexShrink: 0,
            }}
          >
            {manager.name.charAt(0)}
          </div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{manager.name}</div>
        </div>
      ),
    },
    {
      header: "Assigned Attractions",
      cell: (manager) => (
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "rgba(35,114,165,0.08)", color: colors.brand.accent,
            padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
          }}
        >
          <Building size={13} color={colors.brand.accent} />
          {manager.attraction}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (m) => <StatusBadge status={m.status} />,
    },
    {
      header: "Action",
      align: "right",
      cell: (manager) => (
        <button
          onClick={() => { setSelectedManager(manager); setIsEditing(false); }}
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

  // Detail / Edit view
  if (selectedManager) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Header bar */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "16px", background: "#FFFFFF",
            padding: "18px 24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => { setSelectedManager(null); setIsEditing(false); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: colors.bg.page, color: colors.text.primary,
                border: `1px solid ${colors.header.border}`, borderRadius: "8px",
                padding: "8px 14px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", fontFamily: typography.fontFamily.sans,
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Managers</span>
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "20px", color: colors.text.primary, margin: 0 }}>
                  {selectedManager.name}
                </h1>
                <span style={{ background: "rgba(35,114,165,0.1)", color: colors.brand.accent, padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
                  {selectedManager.id}
                </span>
                <span style={{ background: selectedManager.status === "Active" ? "rgba(34,197,94,0.12)" : "#FEF2F2", color: selectedManager.status === "Active" ? colors.status.success : colors.status.error, padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>
                  {selectedManager.status}
                </span>
              </div>
              <p style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", color: colors.text.muted, margin: "2px 0 0" }}>
                Assigned Attraction: {selectedManager.attraction}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: `1px solid ${colors.login.inputBorder}`, background: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: typography.fontFamily.sans }}>Cancel</button>
                <button onClick={handleSaveEdit} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", background: colors.brand.primary, color: colors.sidebar.activeText, border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: typography.fontFamily.sans, boxShadow: "0 4px 12px rgba(244,188,67,0.3)" }}>
                  <Check size={16} /><span>Save Changes</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", background: colors.brand.accent, color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: typography.fontFamily.sans }}>
                  <Edit2 size={16} /><span>Edit Manager</span>
                </button>
                <button onClick={() => handleDeleteManager(selectedManager.id)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "8px", background: "#FEF2F2", color: colors.status.error, border: `1px solid ${colors.status.error}`, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: typography.fontFamily.sans }}>
                  <Trash2 size={16} /><span>Delete Manager</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing ? (
          <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>Edit Manager Information</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Full Name</label>
                <input type="text" value={selectedManager.name} onChange={(e) => setSelectedManager({ ...selectedManager, name: e.target.value })} style={inputStyle(false)} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Assigned Attraction</label>
                <input type="text" value={selectedManager.attraction} onChange={(e) => setSelectedManager({ ...selectedManager, attraction: e.target.value })} style={inputStyle(false)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Phone Number</label>
                <input type="text" maxLength={10} value={selectedManager.phone} onChange={(e) => setSelectedManager({ ...selectedManager, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} style={inputStyle(false)} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Email Address</label>
                <input type="email" value={selectedManager.email} onChange={(e) => setSelectedManager({ ...selectedManager, email: e.target.value })} style={inputStyle(false)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>Account Status</label>
              <StatusToggle status={selectedManager.status} onChange={(s) => setSelectedManager({ ...selectedManager, status: s })} />
            </div>

            {/* Permission tree in edit mode */}
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px", color: colors.text.primary }}>Module Permissions</label>
              <SystemModulePermissionTree
                selectedModules={selectedManager.allowedModules || []}
                onChange={(mods) => setSelectedManager({ ...selectedManager, allowedModules: mods })}
              />
              <AttractionPermissionTree
                enabled={selectedManager.attractionManagementEnabled}
                permissions={selectedManager.attractionPermissions}
                onEnabledChange={(v) => setSelectedManager({ ...selectedManager, attractionManagementEnabled: v, attractionPermissions: v ? selectedManager.attractionPermissions : [] })}
                onPermissionsChange={(p) => setSelectedManager({ ...selectedManager, attractionPermissions: p })}
              />
            </div>
          </div>
        ) : (
          /* Read-only detail */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Contact */}
              <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: `1px solid ${colors.header.border}` }}>
                  <Building size={18} color={colors.brand.accent} />
                  <h3 style={{ fontSize: "15px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>Contact Details</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Phone size={12} /> Phone</span>
                    <strong style={{ fontSize: "14px", marginTop: "2px", display: "block" }}>{selectedManager.phone}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Mail size={12} /> Email</span>
                    <strong style={{ fontSize: "14px", marginTop: "2px", display: "block" }}>{selectedManager.email}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Building size={12} /> Attraction</span>
                    <strong style={{ fontSize: "14px", marginTop: "2px", display: "block", color: colors.brand.accent }}>{selectedManager.attraction}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "block", marginBottom: "4px" }}>Status</span>
                    <StatusToggle
                      status={selectedManager.status}
                      onChange={(s) => {
                        const updated = { ...selectedManager, status: s };
                        setSelectedManager(updated);
                        setManagers(managers.map((m) => (m.id === updated.id ? updated : m)));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: `1px solid ${colors.header.border}` }}>
                  <TrendingUp size={18} color={colors.brand.accent} />
                  <h3 style={{ fontSize: "15px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>Performance Overview</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "block" }}>Total Bookings</span>
                    <strong style={{ fontSize: "16px", color: colors.brand.accent, marginTop: "2px", display: "block" }}>{selectedManager.totalBookings.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "block" }}>Revenue Generated</span>
                    <strong style={{ fontSize: "16px", color: colors.status.success, marginTop: "2px", display: "block" }}>₹{selectedManager.revenueGenerated.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} /> Joined Date</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px", display: "block" }}>{selectedManager.joinedDate}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><ShieldCheck size={12} /> Role Level</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: colors.text.primary, marginTop: "2px", display: "block" }}>Attraction Supervisor</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Module Permission summary */}
            <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "14px", marginBottom: "14px", borderBottom: `1px solid ${colors.header.border}` }}>
                <ShieldCheck size={18} color={colors.brand.accent} />
                <h3 style={{ fontSize: "15px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>
                  Main System Module Access
                </h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedManager.allowedModules && selectedManager.allowedModules.length > 0 ? (
                  selectedManager.allowedModules.map((mod) => (
                    <span
                      key={mod}
                      style={{
                        background: "rgba(35,114,165,0.08)",
                        color: colors.brand.accent,
                        border: `1px solid rgba(35,114,165,0.2)`,
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        fontFamily: typography.fontFamily.sans,
                      }}
                    >
                      {mod === "Reports" ? "Records / Reports" : mod}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "12px", color: colors.text.muted, fontFamily: typography.fontFamily.sans }}>
                    No system modules assigned.
                  </span>
                )}
              </div>
            </div>

            {/* Permission summary */}
            <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "14px", marginBottom: "14px", borderBottom: `1px solid ${colors.header.border}` }}>
                <ShieldCheck size={18} color={colors.brand.accent} />
                <h3 style={{ fontSize: "15px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>
                  Attraction & Module Permissions
                </h3>
                <span
                  style={{
                    fontSize: "12px", fontWeight: 600, color: selectedManager.attractionManagementEnabled ? colors.status.success : colors.status.error,
                    background: selectedManager.attractionManagementEnabled ? "rgba(34,197,94,0.12)" : "#FEF2F2",
                    padding: "2px 8px", borderRadius: "6px",
                  }}
                >
                  {selectedManager.attractionManagementEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              {selectedManager.attractionManagementEnabled && selectedManager.attractionPermissions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedManager.attractionPermissions.map((perm) => {
                    const attraction = INITIAL_ATTRACTIONS.find((a) => a.id === perm.attractionId);
                    if (!attraction) return null;
                    return (
                      <div
                        key={perm.attractionId}
                        style={{ border: `1px solid rgba(35,114,165,0.2)`, borderRadius: "10px", overflow: "hidden" }}
                      >
                        <div style={{ background: "rgba(35,114,165,0.06)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <Building size={14} color={colors.brand.accent} />
                          <span style={{ fontWeight: 700, fontSize: "13px", color: colors.brand.accent, flex: 1, fontFamily: typography.fontFamily.sans }}>{attraction.name}</span>
                          <span style={{ fontSize: "11px", color: colors.brand.primary, fontWeight: 600 }}>{attraction.category}</span>
                        </div>
                        <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {perm.modules.length > 0 ? perm.modules.map((mod) => (
                            <span key={mod} style={{ background: "rgba(35,114,165,0.08)", color: colors.brand.accent, border: `1px solid rgba(35,114,165,0.2)`, borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, fontFamily: typography.fontFamily.sans }}>
                              {mod}
                            </span>
                          )) : (
                            <span style={{ fontSize: "12px", color: colors.text.muted, fontFamily: typography.fontFamily.sans }}>No sub-modules assigned for this attraction</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: colors.text.muted, margin: 0, fontFamily: typography.fontFamily.sans }}>
                  {selectedManager.attractionManagementEnabled
                    ? "No attractions assigned yet."
                    : "Attraction Management access is currently disabled for this manager."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: typography.fontSize["2xl"], color: colors.text.primary, margin: 0 }}>
            Managers ({managers.length})
          </h1>
          <p style={{ fontFamily: typography.fontFamily.sans, fontSize: "14px", color: colors.text.muted, margin: "4px 0 0" }}>
            Manage attraction managers - their assigned attraction, permissions, and access.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: colors.brand.primary, color: colors.sidebar.activeText, border: "none", borderRadius: "8px", padding: "10px 18px", fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(244,188,67,0.3)" }}
        >
          <UserPlus size={18} /><span>Add Manager</span>
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "14px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color={colors.brand.accent} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: colors.text.muted, fontFamily: typography.fontFamily.sans }}>Filter:</span>
          <Building2 size={16} color={colors.text.muted} />
          <select value={selectedAttractionFilter} onChange={(e) => setSelectedAttractionFilter(e.target.value)} style={{ height: "38px", borderRadius: "8px", border: `1px solid ${colors.header.border}`, padding: "0 12px", fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 600, color: colors.brand.accent, outline: "none", cursor: "pointer", background: "#FFFFFF" }}>
            <option value="All">All Attractions</option>
            {extractUniqueAttractions(managers.map((m) => m.attraction)).map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Status Filter */}
          <StatusFilterSelect
            value={selectedStatusFilter}
            onChange={(val) => setSelectedStatusFilter(val)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: colors.bg.page, padding: "8px 14px", borderRadius: "8px", border: `1px solid ${colors.header.border}`, flex: 1, minWidth: "240px" }}>
          <Search size={18} color={colors.text.muted} />
          <input
            type="text" placeholder="Search manager by name, email, phone, or status"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", border: "none", outline: "none", fontSize: "14px", background: "transparent", fontFamily: typography.fontFamily.sans, color: colors.text.primary }}
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredManagers} keyExtractor={(m) => m.id} pageSize={5} emptyMessage="No manager records found matching your search." />

      {/* Add Modal */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(1,27,47,0.65)", backdropFilter: "blur(4px)", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "580px", background: "#FFFFFF", borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ background: colors.sidebar.bg, color: "#FFFFFF", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans }}>Add New Manager</h2>
              <button onClick={() => { setIsAddModalOpen(false); reset(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#FFFFFF" }}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onAddSubmit as Parameters<typeof handleSubmit>[0])}
              style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "75vh", overflowY: "auto" }}
            >
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans }}>Full Name <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="text" placeholder="Enter manager full name" {...register("name")} style={inputStyle(!!errors.name)} />
                <FieldError message={errors.name?.message} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans }}>Phone <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text" maxLength={10} placeholder="9876543210"
                    {...register("phone")}
                    onKeyDown={(e) => { if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                    onInput={(e) => { const v = e.currentTarget.value.replace(/\D/g, "").slice(0, 10); e.currentTarget.value = v; setValue("phone", v, { shouldValidate: true }); }}
                    style={inputStyle(!!errors.phone)}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans }}>Email <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="email" placeholder="manager@gmail.com" {...register("email")} style={inputStyle(!!errors.email)} />
                  <FieldError message={errors.email?.message} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "flex-start" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans }}>Login Password <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="password" placeholder="Min. 6 characters" {...register("password")} style={inputStyle(!!errors.password)} />
                  <FieldError message={errors.password?.message} />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans, display: "block", marginBottom: "6px" }}>
                    Account Status
                  </label>
                  <StatusToggle
                    status={watchedStatus}
                    onChange={(s) => setValue("status", s, { shouldValidate: true })}
                  />
                </div>
              </div>

              {/* Permission Tree */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans, display: "block", marginBottom: "8px" }}>
                  Module Permissions
                </label>
                <SystemModulePermissionTree
                  selectedModules={watchedAllowedModules || []}
                  onChange={(mods) => setValue("allowedModules", mods, { shouldValidate: true })}
                />
                <AttractionPermissionTree
                  enabled={watchedEnabled ?? false}
                  permissions={(watchedPermissions ?? []) as AttractionPermission[]}
                  onEnabledChange={(v) => {
                    setValue("attractionManagementEnabled", v, { shouldValidate: true });
                    if (!v) setValue("attractionPermissions", []);
                  }}
                  onPermissionsChange={(p) => setValue("attractionPermissions", p)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", marginTop: "12px", paddingTop: "16px", borderTop: `1px solid ${colors.header.border}` }}>
                <button type="button" onClick={() => { setIsAddModalOpen(false); reset(); }} style={{ padding: "10px 18px", borderRadius: "8px", border: `1px solid ${colors.login.inputBorder}`, background: "#FFFFFF", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: typography.fontFamily.sans }}>
                  Cancel
                </button>
                <button type="submit" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 22px", borderRadius: "8px", background: colors.brand.primary, color: colors.sidebar.activeText, border: "none", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: typography.fontFamily.sans, boxShadow: "0 4px 12px rgba(244,188,67,0.3)" }}>
                  <UserPlus size={16} /><span>Create Manager</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Suspense wrapper required by Next.js for useSearchParams()
export default function ManagerManagementPage() {
  return (
    <Suspense fallback={null}>
      <ManagerManagementInner />
    </Suspense>
  );
}
