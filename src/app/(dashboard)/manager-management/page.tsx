"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusToggle from "@/components/ui/StatusToggle";
import StatusFilterSelect from "@/components/ui/StatusFilterSelect";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UserPlus,
  UserX,
  Search,
  SearchX,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  X,
  Check,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Filter,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import {
  ManagerUser,
  AttractionPermission,
} from "./types";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete, confirmAdd, confirmStatusChange, showSuccessNotify } from "@/lib/notify";
import { addManagerSchema, AddManagerFormData } from "./schema";
import { DataTable, Column } from "@/components/ui/DataTable";
import { META_CONSTANTS } from "@/lib/metaConstant";
import ExportButtons from "@/components/ui/ExportButtons";
import {
  useManagers,
  fetchManagers,
  useCreateManager,
  useUpdateManager,
  useDisableManager,
  useUpdateManagerPermissions,
  useManagerPermissions,
  useAttractions,
  type AttractionItem,
  ManagerQueryParams,
} from "@/hooks/useManagerQueries";
import {
  ExportScope,
  exportTableToPDF,
  exportToCSV,
  renderStatusBadgeHTML,
  fetchAllPages,
} from "@/lib/exportUtils";
import { useSystemModules, SystemModule } from "@/hooks/useSystemModuleQueries";

// Fixed sub-modules always available inside each attraction
const FIXED_SUB_MODULES = [
  "Staff Management",
  "Inventory Management",
];

// Conditional sub-modules — only shown if the admin's system modules include them
const CONDITIONAL_SUB_MODULES = [
  "Customer Management",
  "Complimentary Passes",
  "CCTV Monitoring",
];

// Helper to normalize sub-module names across different naming conventions
const normalizeSubModuleName = (mod: string): string => {
  const clean = String(mod || "").toLowerCase().trim().replace(/[\s_&-]/g, "");
  if (clean.includes("staff")) return "Staff Management";
  if (clean.includes("inventory")) return "Inventory Management";
  if (clean.includes("customer")) return "Customer Management";
  if (clean.includes("complimentary") || clean.includes("pass")) return "Complimentary Passes";
  if (clean.includes("cctv")) return "CCTV Monitoring";
  return mod;
};

const isSameSubModule = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeSubModuleName(a).toLowerCase() === normalizeSubModuleName(b).toLowerCase();
};

function SystemModulePermissionTree({
  selectedModules,
  modules,
  isLoading,
  onChange,
}: {
  selectedModules: string[];
  modules: SystemModule[];
  isLoading?: boolean;
  onChange: (modules: string[]) => void;
}) {
  const isExcludedModule = (mod: SystemModule) => {
    const name = (mod.name || "").toLowerCase().trim();
    const key = (mod.key || "").toLowerCase().replace(/[\s_-]/g, "");
    return (
      name === "ticket booking" ||
      name === "scanner" ||
      name === "manager management" ||
      name === "attraction management" ||
      name === "customer management" ||
      name === "customers" ||
      name === "complimentary passes" ||
      name === "complimentary pass" ||
      name === "complimentary" ||
      name === "cctv monitoring" ||
      name === "cctv" ||
      name === "seat management" ||
      name === "seats" ||
      name === "counter assignment" ||
      name === "user management" ||
      key === "ticketbooking" ||
      key === "scanner" ||
      key === "managermanagement" ||
      key === "attractionmanagement" ||
      key === "customermanagement" ||
      key === "customers" ||
      key === "customer" ||
      key === "complimentarypasses" ||
      key === "complimentarypass" ||
      key === "complimentary" ||
      key === "cctvmonitoring" ||
      key === "cctv" ||
      key === "seatmanagement" ||
      key === "seats" ||
      key === "seat" ||
      key === "counterassignment" ||
      key === "usermanagement" ||
      key === "managers" ||
      key === "attractions"
    );
  };

  const activeModules = modules.filter(
    (m) =>
      (String(m.isActive).toUpperCase() === "ACTIVE" || (m.isActive as unknown) === true) &&
      !isExcludedModule(m)
  );

  const allSelected =
    activeModules.length > 0 && activeModules.every((m) => selectedModules.includes(m.id));

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(activeModules.map((m) => m.id));
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
        {activeModules.length > 0 && (
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
        )}
      </div>

      <div
        style={{
          padding: "12px 16px",
          background: "#FFFFFF",
          display: activeModules.length > 0 ? "grid" : "block",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "16px", textAlign: "center", color: colors.text.muted, fontSize: "13px" }}>
            Loading system modules...
          </div>
        ) : activeModules.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", color: colors.text.muted, fontSize: "13px" }}>
            No active system modules available.
          </div>
        ) : (
          activeModules.map((mod) => {
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
                    {mod.name}
                  </div>
                  {mod.description && (
                    <div style={{ fontSize: "11px", color: colors.text.muted }}>
                      {mod.description}
                    </div>
                  )}
                </div>
              </label>
            );
          })
        )}
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
      <span style={{ fontSize: "10px" }}>⚠</span>
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
function getAttractionFromPermissions(
  permissions: AttractionPermission[],
  attractionsList: AttractionItem[] = []
): string {
  if (!permissions || permissions.length === 0) return "—";
  const names = permissions
    .map((p) => {
      const found = attractionsList.find((a) => a.id === p.attractionId);
      return found?.name || p.attractionName || p.attractionId;
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

// Attraction Permission Tree
function AttractionPermissionTree({
  enabled,
  permissions,
  attractions = [],
  systemModules = [],
  onEnabledChange,
  onPermissionsChange,
}: {
  enabled: boolean;
  permissions: AttractionPermission[];
  attractions?: AttractionItem[];
  systemModules?: SystemModule[];
  onEnabledChange: (v: boolean) => void;
  onPermissionsChange: (p: AttractionPermission[]) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Build the effective sub-modules list: always fixed ones + conditional ones if admin has access
  const getEffectiveSubModules = (): string[] => {
    const conditionalEnabled = CONDITIONAL_SUB_MODULES.filter((mod) =>
      systemModules.some((sm) => {
        const smName = (sm.name || "").toLowerCase().trim();
        const smKey = (sm.key || "").toLowerCase().replace(/[\s_-]/g, "");
        const modLower = mod.toLowerCase().trim();
        const modKey = mod.toLowerCase().replace(/[\s_-]/g, "");
        const isActive = String(sm.isActive).toUpperCase() === "ACTIVE" || (sm.isActive as unknown) === true;
        return (
          isActive &&
          (smName === modLower ||
            smKey === modKey ||
            isSameSubModule(smName, mod) ||
            isSameSubModule(smKey, mod))
        );
      })
    );
    return [...FIXED_SUB_MODULES, ...conditionalEnabled];
  };

  const effectiveSubModules = getEffectiveSubModules();

  const getPermission = (attractionId: string) =>
    permissions.find((p) => p.attractionId === attractionId);

  const isAttractionSelected = (attractionId: string) =>
    !!getPermission(attractionId);

  const isSubModuleSelected = (permModules: string[] | undefined, mod: string): boolean => {
    if (!permModules) return false;
    return permModules.some((m) => isSameSubModule(m, mod));
  };

  const toggleAttraction = (attractionId: string) => {
    const alreadySelected = isAttractionSelected(attractionId);
    if (alreadySelected) {
      onPermissionsChange(permissions.filter((p) => p.attractionId !== attractionId));
      setExpandedIds((prev) => prev.filter((id) => id !== attractionId));
    } else {
      // Do not pre-select any sub-modules by default inside the attraction
      onPermissionsChange([...permissions, { attractionId, modules: [] }]);
      setExpandedIds((prev) => [...prev, attractionId]);
    }
  };

  const toggleSubModule = (attractionId: string, module: string) => {
    onPermissionsChange(
      permissions.map((p) => {
        if (p.attractionId !== attractionId) return p;
        const normMod = normalizeSubModuleName(module);
        const hasModule = (p.modules || []).some((m) => isSameSubModule(m, normMod));
        return {
          ...p,
          modules: hasModule
            ? p.modules.filter((m) => !isSameSubModule(m, normMod))
            : [...p.modules.map(normalizeSubModuleName), normMod],
        };
      })
    );
  };

  const toggleAllSubModules = (attractionId: string, selectAll: boolean) => {
    onPermissionsChange(
      permissions.map((p) =>
        p.attractionId === attractionId
          ? { ...p, modules: selectAll ? [...effectiveSubModules] : [] }
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
          {attractions.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: colors.text.muted, fontSize: "13px" }}>
              No active attractions found.
            </div>
          ) : (
            attractions.map((attraction, idx) => {
              const selected = isAttractionSelected(attraction.id);
              const expanded = expandedIds.includes(attraction.id);
              const perm = getPermission(attraction.id);
              const allSubsChecked =
                perm &&
                effectiveSubModules.length > 0 &&
                effectiveSubModules.every((mod) => isSubModuleSelected(perm.modules, mod));

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
                      {attraction.category && (
                        <div style={{ fontSize: "11px", color: colors.brand.primary, fontWeight: 600 }}>
                          {attraction.category}
                        </div>
                      )}
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
                        {perm?.modules.length ?? 0}/{effectiveSubModules.length} modules
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
                          checked={Boolean(allSubsChecked)}
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

                      {effectiveSubModules.map((mod) => {
                        const modEnabled = isSubModuleSelected(perm?.modules, mod);
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
            })
          )}
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
          : "Enable Attraction Management to assign attraction access"}
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
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAttractionFilter, setSelectedAttractionFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(
    searchParams.get("status") ?? "All"
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ManagerUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Debounce search input for API
  useEffect(() => {
    const trimmed = searchQuery.trim();
    const handler = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedAttractionFilter, selectedStatusFilter]);

  // Status mapping for API ("ACTIVE" | "INACTIVE")
  const apiStatus =
    selectedStatusFilter === "Active" || selectedStatusFilter === "ACTIVE"
      ? ("ACTIVE" as const)
      : selectedStatusFilter === "Inactive" || selectedStatusFilter === "INACTIVE"
        ? ("INACTIVE" as const)
        : undefined;

  // TanStack Query Hooks — directly driven by API
  const { data: apiManagerData, isLoading: isFetchingManagers } = useManagers({
    search: debouncedSearch.trim() || undefined,
    status: apiStatus,
    attractionId: selectedAttractionFilter !== "All" ? selectedAttractionFilter : undefined,
    page: currentPage,
    limit: pageSize,
  });

  const pagination = apiManagerData?.pagination ?? {
    page: currentPage,
    limit: pageSize,
    total: managers.length,
    totalPages: 1,
  };

  // Adjust page if total pages decreases (e.g. after deletion)
  useEffect(() => {
    if (pagination.totalPages > 0 && currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [pagination.totalPages, currentPage]);
  const { data: systemModules = [] } = useSystemModules();
  const { data: attractionsData } = useAttractions();
  const attractionsList: AttractionItem[] = attractionsData || [];

  const { data: managerPermissionsData } = useManagerPermissions(
    selectedManager?.id || "",
    Boolean(selectedManager?.id)
  );

  const createManagerMutation = useCreateManager();
  const updateManagerMutation = useUpdateManager();
  const updateManagerPermissionsMutation = useUpdateManagerPermissions();
  const disableManagerMutation = useDisableManager();

  // Sync API managers when loaded — strictly use backend data only
  useEffect(() => {
    if (apiManagerData?.managers) {
      const mapped: ManagerUser[] = apiManagerData.managers.map((m: any) => {
        const attractions = m.attractions || [];
        const attractionNames = attractions.map((a: any) => a.name).filter(Boolean);
        const attractionLabel = attractionNames.length > 0 ? attractionNames.join(", ") : "—";
        const attrPerms: AttractionPermission[] = attractions.map((a: any) => ({
          attractionId: a.id,
          attractionName: a.name,
          modules: (a.modules || []).map((mod: any) =>
            normalizeSubModuleName(mod.name || mod.key || mod.id || mod)
          ),
        }));

        return {
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone ?? null,
          role: m.role || "MANAGER",
          status: m.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
          createdAt: m.createdAt || new Date().toISOString(),
          lastLoginAt: m.lastLoginAt ?? null,
          attraction: attractionLabel,
          attractions: attractions,
          totalBookings: 0,
          revenueGenerated: 0,
          attractionManagementEnabled: attractions.length > 0,
          staffCreationEnabled: true,
          allowedModules: [],
          attractionPermissions: attrPerms,
        };
      });
      setManagers(mapped);
    } else {
      setManagers([]);
    }
  }, [apiManagerData]);

  // Sync permissions when single manager details are loaded
  useEffect(() => {
    if (managerPermissionsData && selectedManager) {
      const sysMods = (managerPermissionsData.systemModules || []).map((sm) => sm.id);
      const attrPerms: AttractionPermission[] = (managerPermissionsData.attractions || []).map((attr) => ({
        attractionId: attr.id,
        attractionName: attr.name,
        modules: (attr.modules || []).map((m: any) =>
          normalizeSubModuleName(typeof m === "string" ? m : (m.name || m.key || m.id || ""))
        ),
      }));
      const computedAttraction = getAttractionFromPermissions(attrPerms, attractionsList);

      setSelectedManager((prev) =>
        prev && prev.id === selectedManager.id
          ? {
            ...prev,
            allowedModules: sysMods,
            attractionManagementEnabled: attrPerms.length > 0,
            attractionPermissions: attrPerms,
            attraction: computedAttraction,
          }
          : prev
      );
    }
  }, [managerPermissionsData, attractionsList]);

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
      allowedModules: [] as string[],
      attractionManagementEnabled: true,
      attractionPermissions: [] as AttractionPermission[],
    },
  });

  const watchedStatus = useWatch({ control, name: "status", defaultValue: "Active" });
  const watchedEnabled = useWatch({ control, name: "attractionManagementEnabled", defaultValue: true });
  const watchedPermissions = useWatch({ control, name: "attractionPermissions", defaultValue: [] });

  // Filter (client instant fallback & sync)
  const filteredManagers = managers.filter((m) => {
    const statusMatches =
      selectedStatusFilter === "All" ||
      (selectedStatusFilter === "Active" && (m.status === "ACTIVE" || m.status === "Active")) ||
      (selectedStatusFilter === "Inactive" && (m.status === "INACTIVE" || m.status === "Inactive"));

    const attractionMatches =
      selectedAttractionFilter === "All" ||
      (m.attractions && m.attractions.some((a) => a.id === selectedAttractionFilter || a.name === selectedAttractionFilter)) ||
      (m.attraction && m.attraction.toLowerCase().includes(selectedAttractionFilter.toLowerCase()));

    const searchLower = searchQuery.toLowerCase();
    const searchMatches =
      !searchQuery ||
      m.name.toLowerCase().includes(searchLower) ||
      m.email.toLowerCase().includes(searchLower) ||
      (m.phone && m.phone.toLowerCase().includes(searchLower)) ||
      (m.attraction && m.attraction.toLowerCase().includes(searchLower));

    return statusMatches && attractionMatches && searchMatches;
  });

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedAttractionFilter !== "All" ||
    selectedStatusFilter !== "All";

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedAttractionFilter("All");
    setSelectedStatusFilter("All");
  };

  // Add Manager — sends exact backend payload format with module UUIDs
  // Returns null if no UUID match found — callers must filter(Boolean) to drop unresolved names
  const resolveModuleId = (modItem: string): string | null => {
    if (!modItem) return null;
    // Already looks like a UUID — pass through as-is
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(modItem)) return modItem;

    const normMod = normalizeSubModuleName(modItem).toLowerCase();
    const cleanMod = String(modItem).toLowerCase().trim().replace(/[\s_&-]/g, "");

    // 1. Direct match by id, name, or key
    let found = systemModules.find(
      (sm) =>
        sm.id === modItem ||
        (sm.name && sm.name.toLowerCase() === modItem.toLowerCase()) ||
        (sm.key && sm.key.toLowerCase() === modItem.toLowerCase())
    );

    // 2. Normalized match (e.g. "Inventory Management" -> matches key "INVENTORY_CAPACITY" or name "Inventory & Capacity")
    if (!found) {
      found = systemModules.find((sm) => {
        const smNameNorm = normalizeSubModuleName(sm.name || "").toLowerCase();
        const smKeyNorm = normalizeSubModuleName(sm.key || "").toLowerCase();
        const smKeyClean = (sm.key || "").toLowerCase().replace(/[\s_&-]/g, "");
        const smNameClean = (sm.name || "").toLowerCase().replace(/[\s_&-]/g, "");

        if (smNameNorm === normMod || smKeyNorm === normMod) return true;
        if (cleanMod.includes("inventory") && (smKeyClean.includes("inventory") || smNameClean.includes("inventory"))) return true;
        if (cleanMod.includes("staff") && (smKeyClean.includes("staff") || smNameClean.includes("staff"))) return true;
        if (cleanMod.includes("customer") && (smKeyClean.includes("customer") || smNameClean.includes("customer"))) return true;
        if ((cleanMod.includes("complimentary") || cleanMod.includes("pass")) && (smKeyClean.includes("complimentary") || smKeyClean.includes("pass") || smNameClean.includes("complimentary") || smNameClean.includes("pass"))) return true;
        if (cleanMod.includes("cctv") && (smKeyClean.includes("cctv") || smNameClean.includes("cctv"))) return true;
        return false;
      });
    }

    return found ? found.id : null;
  };

  const isRemovedSubModule = (modItem: string): boolean => {
    const lower = String(modItem).toLowerCase().trim().replace(/[\s_-]/g, "");
    return lower === "counterassignment" || lower === "usermanagement";
  };

  const onAddSubmit = async (data: AddManagerFormData) => {
    const confirmed = await confirmAdd(`manager "${data.name}"`);
    if (!confirmed) return;

    try {
      await createManagerMutation.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone ? data.phone.trim() : undefined,
        password: data.password,
        status: data.status === "Active" ? "ACTIVE" : "INACTIVE",
        attractionPermissions: data.attractionManagementEnabled
          ? (data.attractionPermissions || []).map((p) => ({
            attractionId: p.attractionId,
            moduleIds: (p.modules || [])
              .filter((m) => !isRemovedSubModule(m))
              .map(resolveModuleId)
              .filter((id): id is string => id !== null),
          }))
          : [],
      });

      setIsAddModalOpen(false);
      reset();
    } catch {
      // Handled via TanStack Query onError and notify
    }
  };

  // Edit
  const handleSaveEdit = async () => {
    if (!selectedManager) return;
    if (!selectedManager.attractionPermissions || selectedManager.attractionPermissions.length === 0) {
      showToast("At least one attraction must be assigned to the manager", "warning");
      return;
    }
    const computedAttraction = getAttractionFromPermissions(selectedManager.attractionPermissions || [], attractionsList);
    const updated = { ...selectedManager, attraction: computedAttraction };

    try {
      await updateManagerMutation.mutateAsync({
        managerId: selectedManager.id,
        data: {
          name: selectedManager.name,
          email: selectedManager.email,
          phone: selectedManager.phone || undefined,
          status: selectedManager.status === "Active" || selectedManager.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
        },
      });

      // Submit full permission state to PUT /api/admin/managers/:id/permissions
      await updateManagerPermissionsMutation.mutateAsync({
        managerId: selectedManager.id,
        data: {
          attractionPermissions: (selectedManager.attractionPermissions || []).map((p) => ({
            attractionId: p.attractionId,
            moduleIds: (p.modules || [])
              .filter((m) => !isRemovedSubModule(m))
              .map(resolveModuleId)
              .filter((id): id is string => id !== null),
          })),
        },
      });

      setManagers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedManager(null);
      setIsEditing(false);
    } catch {
      // Keep edit state open if mutation fails
    }
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ── Export Handlers (Scoped Export) ───────────────────────────────────────
  const getFilterInfo = () => {
    const parts: string[] = [];
    if (selectedStatusFilter !== "All") parts.push(`Status: ${selectedStatusFilter}`);
    if (searchQuery) parts.push(`Search: "${searchQuery}"`);
    return parts.length > 0 ? parts.join(" | ") : undefined;
  };

  const getExportData = async (scope: ExportScope) => {
    const statusParam =
      selectedStatusFilter === "Active"
        ? ("ACTIVE" as const)
        : selectedStatusFilter === "Inactive"
          ? ("INACTIVE" as const)
          : undefined;

    const base: ManagerQueryParams = {
      search: searchQuery.trim() || undefined,
      status: statusParam,
      attractionId: selectedAttractionFilter !== "All" ? selectedAttractionFilter : undefined,
    };

    if (scope === "current") {
      const res = await fetchManagers({ ...base, page: currentPage, limit: pageSize });
      return res.managers;
    } else {
      return await fetchAllPages(async (page, limit) => {
        const res = await fetchManagers({ ...base, page, limit });
        return { items: res.managers, pagination: res.pagination };
      });
    }
  };

  const handleExportPDF = async (scope: ExportScope) => {
    setIsExportingPDF(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) {
        showToast("No manager data matches current filters", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : "Current";
      await exportTableToPDF<ManagerUser | (typeof items)[0]>({
        title: "MANAGERS REPORT",
        filterInfo: getFilterInfo(),
        scope,
        filename: `Managers_${scopeLabel}_${dateKey}.pdf`,
        orientation: "portrait",
        columns: [
          { header: "#", accessor: (_, i) => (scope === "all" ? i + 1 : (currentPage - 1) * pageSize + i + 1), width: "40px" },
          { header: "Manager Name", accessor: (m) => m.name || "-" },
          { header: "Email Address", accessor: (m) => m.email || "-" },
          { header: "Phone Number", accessor: (m) => m.phone || "-" },
          {
            header: "Assigned Attraction",
            accessor: (m: any) => {
              if (m.attractions && m.attractions.length > 0) {
                return m.attractions.map((a: any) => a.name).join(", ");
              }
              return m.attraction || "—";
            },
          },
          { header: "Role", accessor: (m) => m.role || "MANAGER" },
          {
            header: "Status",
            renderCell: (m) => renderStatusBadgeHTML(m.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"),
            align: "center",
          },
        ],
        data: items,
        summaryCards: [
          { label: "Total Managers", value: items.length },
          { label: "Active Managers", value: items.filter((m) => m.status === "ACTIVE").length },
        ],
      });
      showToast(`PDF downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Manager PDF export error:", err);
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
        showToast("No manager data matches current filters", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : "Current";
      const headers = ["#", "Manager Name", "Email Address", "Phone Number", "Assigned Attraction", "Role", "Status"];
      const rows = items.map((m: any, i) => [
        scope === "all" ? i + 1 : (currentPage - 1) * pageSize + i + 1,
        m.name || "-",
        m.email || "-",
        m.phone || "-",
        m.attractions && m.attractions.length > 0
          ? m.attractions.map((a: any) => a.name).join(", ")
          : m.attraction || "-",
        m.role || "MANAGER",
        m.status === "ACTIVE" ? "Active" : "Inactive",
      ]);
      exportToCSV(`Managers_${scopeLabel}_${dateKey}`, headers, rows);
      showToast(`Excel downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Manager Excel export error:", err);
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Delete
  const handleDeleteManager = async (id: string) => {
    const target = managers.find((m) => m.id === id);
    const confirmed = await confirmDelete(`manager "${target?.name ?? id}"`);
    if (!confirmed) return;

    try {
      await disableManagerMutation.mutateAsync(id);
      setManagers((prev) => prev.filter((m) => m.id !== id));
      setSelectedManager(null);
      setIsEditing(false);
    } catch {
      // Failed - keep manager detail view open
    }
  };

  // Status toggle with confirmation
  const handleStatusChangeWithConfirm = async (manager: ManagerUser, newStatus: "Active" | "Inactive") => {
    const confirmed = await confirmStatusChange(manager.name, newStatus);
    if (!confirmed) return;
    const apiStatus = newStatus === "Active" ? "ACTIVE" : "INACTIVE";
    const updated = { ...manager, status: apiStatus };

    try {
      await updateManagerMutation.mutateAsync({
        managerId: manager.id,
        data: {
          status: apiStatus,
        },
      });

      setManagers((prev) => prev.map((m) => (m.id === manager.id ? (updated as ManagerUser) : m)));
      if (selectedManager?.id === manager.id) {
        setSelectedManager(updated as ManagerUser);
      }
    } catch {
      // Failed - do not update state
    }
  };

  // Table columns matching backend response fields
  const columns: Column<ManagerUser>[] = [
    {
      header: "Manager Name",
      cell: (manager) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: colors.sidebar.bg,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {manager.name ? manager.name.charAt(0).toUpperCase() : "M"}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: "14px" }}>
              {manager.name}
            </div>
            <div style={{ fontSize: "12px", color: colors.text.muted }}>
              {manager.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Phone",
      cell: (manager) => (
        <span style={{ fontSize: "13px", color: colors.text.primary, fontWeight: 500 }}>
          {manager.phone || "—"}
        </span>
      ),
    },
    {
      header: "Assigned Attraction",
      cell: (manager) => {
        const attractions =
          manager.attractions && manager.attractions.length > 0
            ? manager.attractions
            : manager.attraction && manager.attraction !== "—"
              ? [{ id: manager.id, name: manager.attraction }]
              : [];

        if (attractions.length === 0) {
          return (
            <span style={{ fontSize: "13px", color: colors.text.muted }}>
              —
            </span>
          );
        }

        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {attractions.map((attr, idx) => (
              <span
                key={attr.id || idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "rgba(35,114,165,0.08)",
                  color: colors.brand.accent,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Building size={13} color={colors.brand.accent} />
                {attr.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (m) => <StatusBadge status={m.status === "ACTIVE" || m.status === "Active" ? "Active" : "Inactive"} />,
    },
    {
      header: "Action",
      align: "right",
      cell: (manager) => (
        <button
          onClick={() => {
            setSelectedManager(manager);
            setIsEditing(false);
          }}
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
                <span style={{ background: "rgba(35,114,165,0.1)", color: colors.brand.accent, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                  {selectedManager.role || "MANAGER"}
                </span>
                <StatusBadge status={selectedManager.status === "ACTIVE" || selectedManager.status === "Active" ? "Active" : "Inactive"} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  disabled={updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending}
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.login.inputBorder}`,
                    background: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: (updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending) ? "not-allowed" : "pointer",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending}
                  onClick={handleSaveEdit}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: (updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending) ? "#E5E7EB" : colors.brand.primary,
                    color: (updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending) ? "#6B7280" : colors.sidebar.activeText,
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: (updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending) ? "not-allowed" : "pointer",
                    fontFamily: typography.fontFamily.sans,
                    boxShadow: (updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending) ? "none" : "0 4px 12px rgba(244,188,67,0.3)",
                  }}
                >
                  {(updateManagerMutation.isPending || updateManagerPermissionsMutation.isPending) ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
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
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Email Address</label>
                <input type="email" value={selectedManager.email} onChange={(e) => setSelectedManager({ ...selectedManager, email: e.target.value })} style={inputStyle(false)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Phone Number</label>
                <input type="text" maxLength={10} value={selectedManager.phone || ""} onChange={(e) => setSelectedManager({ ...selectedManager, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} style={inputStyle(false)} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>Account Status</label>
                <StatusToggle
                  status={selectedManager.status === "ACTIVE" || selectedManager.status === "Active" ? "Active" : "Inactive"}
                  onChange={(s) => setSelectedManager({ ...selectedManager, status: s === "Active" ? "ACTIVE" : "INACTIVE" })}
                />
              </div>
            </div>

            {/* Attraction Permission tree in edit mode */}
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px", color: colors.text.primary }}>Attraction Management Permissions</label>
              <AttractionPermissionTree
                enabled={selectedManager.attractionManagementEnabled ?? true}
                permissions={selectedManager.attractionPermissions || []}
                attractions={attractionsList}
                systemModules={systemModules}
                onEnabledChange={(v) => setSelectedManager({ ...selectedManager, attractionManagementEnabled: v, attractionPermissions: v ? (selectedManager.attractionPermissions || []) : [] })}
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
                  <h3 style={{ fontSize: "15px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>Account & Contact Details</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Phone size={12} /> Phone</span>
                    <strong style={{ fontSize: "14px", marginTop: "2px", display: "block" }}>{selectedManager.phone || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Mail size={12} /> Email</span>
                    <strong style={{ fontSize: "14px", marginTop: "2px", display: "block" }}>{selectedManager.email}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} /> Created Date</span>
                    <strong style={{ fontSize: "14px", marginTop: "2px", display: "block", color: colors.text.primary }}>
                      {selectedManager.createdAt
                        ? new Date(selectedManager.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "block", marginBottom: "4px" }}>Status</span>
                    <StatusBadge status={selectedManager.status === "ACTIVE" || selectedManager.status === "Active" ? "Active" : "Inactive"} />
                  </div>
                </div>
              </div>

              {/* Activity / Login info */}
              <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: `1px solid ${colors.header.border}` }}>
                  <TrendingUp size={18} color={colors.brand.accent} />
                  <h3 style={{ fontSize: "15px", margin: 0, fontWeight: 700, fontFamily: typography.fontFamily.sans, color: colors.text.primary }}>Activity & Security</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "block" }}>Role</span>
                    <strong style={{ fontSize: "14px", color: colors.brand.accent, marginTop: "2px", display: "block" }}>{selectedManager.role || "MANAGER"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "block" }}>Last Login</span>
                    <strong style={{ fontSize: "14px", color: selectedManager.lastLoginAt ? colors.status.success : colors.text.muted, marginTop: "2px", display: "block" }}>
                      {selectedManager.lastLoginAt
                        ? new Date(selectedManager.lastLoginAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        : "Never logged in"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} /> Registered At</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px", display: "block" }}>
                      {selectedManager.createdAt ? new Date(selectedManager.createdAt).toISOString().slice(0, 10) : "—"}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: colors.text.muted, display: "flex", alignItems: "center", gap: "4px" }}><ShieldCheck size={12} /> Role Level</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: colors.text.primary, marginTop: "2px", display: "block" }}>Manager</span>
                  </div>
                </div>
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

              {selectedManager.attractionManagementEnabled && (selectedManager.attractionPermissions || []).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(selectedManager.attractionPermissions || []).map((perm) => {
                    const attraction =
                      attractionsList.find((a) => a.id === perm.attractionId) ||
                      selectedManager.attractions?.find((a) => a.id === perm.attractionId) ||
                      { name: perm.attractionName || "Attraction", category: "RIDE" };
                    if (!attraction) return null;
                    return (
                      <div
                        key={perm.attractionId}
                        style={{ border: `1px solid rgba(35,114,165,0.2)`, borderRadius: "10px", overflow: "hidden" }}
                      >
                        <div style={{ background: "rgba(35,114,165,0.06)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <Building size={14} color={colors.brand.accent} />
                          <span style={{ fontWeight: 700, fontSize: "13px", color: colors.brand.accent, flex: 1, fontFamily: typography.fontFamily.sans }}>{attraction.name}</span>
                          <span style={{ fontSize: "11px", color: colors.brand.primary, fontWeight: 600 }}>{attraction.category || "ATTRACTION"}</span>
                        </div>
                        <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {perm.modules.length > 0 ? (
                            perm.modules.map((modId) => {
                              const modObj = systemModules.find(
                                (sm) =>
                                  sm.id === modId ||
                                  sm.name === modId ||
                                  isSameSubModule(sm.name, modId) ||
                                  isSameSubModule(sm.key, modId)
                              );
                              const displayName = modObj ? modObj.name : normalizeSubModuleName(modId);
                              return (
                                <span
                                  key={modId}
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
                                  {displayName}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ fontSize: "12px", color: colors.text.muted, fontFamily: typography.fontFamily.sans }}>
                              No sub-modules assigned for this attraction
                            </span>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <ExportButtons
          onExportPDFScope={handleExportPDF}
          onExportExcelScope={handleExportExcel}
          isExportingPDF={isExportingPDF}
          isExportingExcel={isExportingExcel}
          disabled={isFetchingManagers || (filteredManagers.length === 0 && (apiManagerData?.pagination?.total ?? 0) === 0)}
        />

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
          <select value={selectedAttractionFilter} onChange={(e) => setSelectedAttractionFilter(e.target.value)} style={{ height: "38px", borderRadius: "8px", border: `1px solid ${colors.header.border}`, padding: "0 12px", fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 600, color: colors.brand.accent, outline: "none", cursor: "pointer", background: "#FFFFFF" }}>
            <option value="All">All Attractions</option>
            {attractionsList.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
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
            type="text"
            placeholder="Search manager by name, email, phone, or status"
            value={searchQuery}
            onKeyDown={(e) => {
              if (e.key === " " && searchQuery === "") {
                e.preventDefault();
              }
            }}
            onChange={(e) => setSearchQuery(e.target.value.trimStart())}
            style={{ width: "100%", border: "none", outline: "none", fontSize: "14px", background: "transparent", fontFamily: typography.fontFamily.sans, color: colors.text.primary }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredManagers}
        keyExtractor={(m) => m.id}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        isLoading={isFetchingManagers}
        emptyIcon={
          isFiltered ? (
            <SearchX size={26} color={colors.brand.accent} />
          ) : (
            <UserX size={26} color={colors.brand.accent} />
          )
        }
        emptyTitle={
          isFiltered ? "No Matching Managers Found" : "No Managers Found"
        }
        emptyDescription={
          isFiltered
            ? searchQuery.trim()
              ? `No manager records found matching "${searchQuery}". Try adjusting your keywords or clearing your filters.`
              : "No manager records match the selected filter criteria. Try adjusting or clearing your filters."
            : "There are currently no manager records in the system. Click 'Add Manager' to register your first manager."
        }
        emptyAction={
          isFiltered ? (
            <button
              type="button"
              onClick={handleResetFilters}
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
              Clear Filters & Search
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
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
              <span>Add Manager</span>
            </button>
          )
        }
      />

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
                    type="text" maxLength={10} placeholder="Enter phone number"
                    {...register("phone")}
                    onKeyDown={(e) => { if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                    onInput={(e) => { const v = e.currentTarget.value.replace(/\D/g, "").slice(0, 10); e.currentTarget.value = v; setValue("phone", v, { shouldValidate: true }); }}
                    style={inputStyle(!!errors.phone)}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans }}>Email <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="email" placeholder="enter email address" {...register("email")} style={inputStyle(!!errors.email)} />
                  <FieldError message={errors.email?.message} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "flex-start" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans }}>Login Password <span style={{ color: "#EF4444" }}>*</span></label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showAddPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      {...register("password")}
                      style={{ ...inputStyle(!!errors.password), paddingRight: "40px" }}
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
                      {showAddPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
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

              {/* Attraction Permission Tree */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily.sans, display: "block", marginBottom: "8px" }}>
                  Attraction Management Permissions
                </label>
                <AttractionPermissionTree
                  enabled={watchedEnabled ?? false}
                  permissions={(watchedPermissions ?? []) as AttractionPermission[]}
                  attractions={attractionsList}
                  systemModules={systemModules}
                  onEnabledChange={(v) => {
                    setValue("attractionManagementEnabled", v, { shouldValidate: true });
                    if (!v) setValue("attractionPermissions", [], { shouldValidate: true });
                  }}
                  onPermissionsChange={(p) => setValue("attractionPermissions", p, { shouldValidate: true })}
                />
                <FieldError message={errors.attractionPermissions?.message} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", marginTop: "12px", paddingTop: "16px", borderTop: `1px solid ${colors.header.border}` }}>
                <button
                  type="button"
                  disabled={createManagerMutation.isPending}
                  onClick={() => { setIsAddModalOpen(false); reset(); }}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.login.inputBorder}`,
                    background: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: createManagerMutation.isPending ? "not-allowed" : "pointer",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createManagerMutation.isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: createManagerMutation.isPending ? "#E5E7EB" : colors.brand.primary,
                    color: createManagerMutation.isPending ? "#6B7280" : colors.sidebar.activeText,
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: createManagerMutation.isPending ? "not-allowed" : "pointer",
                    fontFamily: typography.fontFamily.sans,
                    boxShadow: createManagerMutation.isPending ? "none" : "0 4px 12px rgba(244,188,67,0.3)",
                  }}
                >
                  {createManagerMutation.isPending ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Creating Manager...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Create Manager</span>
                    </>
                  )}
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
