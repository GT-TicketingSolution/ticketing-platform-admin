/**
 * Manager authentication helpers.
 * Manager accounts are defined in-memory via INITIAL_MANAGERS (admin.ts).
 */

export const MANAGER_SESSION_KEY = "manager_session";

// Types mirrored from admin.ts (kept lean for the auth layer)
export interface StoredAttractionPermission {
  attractionId: string;
  modules: string[];
}

export interface StoredManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  attraction: string;
  joinedDate: string;
  status: "Active" | "Inactive";
  attractionManagementEnabled: boolean;
  allowedModules?: string[];
  attractionPermissions: StoredAttractionPermission[];
}

const DEMO_MANAGERS: StoredManager[] = [
  {
    id: "MGR-101",
    name: "Rajesh Kumar",
    email: "rajesh.kumar@gmail.com",
    phone: "9876543210",
    password: "manager123",
    attraction: "Toy Train, Ropeway",
    joinedDate: "2024-01-15",
    status: "Active",
    attractionManagementEnabled: true,
    attractionPermissions: [
      {
        attractionId: "ATR-001",
        modules: ["Counter Assignment", "Customer Management", "Complimentary Passes", "User Management", "CCTV Monitoring"],
      },
      {
        attractionId: "ATR-002",
        modules: ["Counter Assignment", "Customer Management", "CCTV Monitoring"],
      },
    ],
  },
  {
    id: "MGR-102",
    name: "Anita Sharma",
    email: "anita.sharma@gmail.com",
    phone: "9812345678",
    password: "manager123",
    attraction: "Wax Museum",
    joinedDate: "2024-02-10",
    status: "Active",
    attractionManagementEnabled: true,
    attractionPermissions: [
      {
        attractionId: "ATR-003",
        modules: ["Counter Assignment", "Customer Management", "Complimentary Passes"],
      },
    ],
  },
  {
    id: "MGR-103",
    name: "Vikram Mehta",
    email: "vikram.mehta@gmail.com",
    phone: "9988776655",
    password: "manager123",
    attraction: "Sheesh Mahal",
    joinedDate: "2024-03-01",
    status: "Active",
    attractionManagementEnabled: true,
    attractionPermissions: [
      { attractionId: "ATR-005", modules: ["CCTV Monitoring"] },
    ],
  },
  {
    id: "MGR-104",
    name: "Pooja Verma",
    email: "pooja.verma@gmail.com",
    phone: "9765432109",
    password: "manager123",
    attraction: "Biological Park, Fort Entry",
    joinedDate: "2024-04-18",
    status: "Active",
    attractionManagementEnabled: true,
    attractionPermissions: [
      {
        attractionId: "ATR-004",
        modules: ["Counter Assignment", "Complimentary Passes", "User Management"],
      },
      { attractionId: "ATR-006", modules: ["Customer Management"] },
    ],
  },
  {
    id: "MGR-105",
    name: "Suresh Joshi",
    email: "suresh.joshi@gmail.com",
    phone: "9654321098",
    password: "manager123",
    attraction: "Main Entrance",
    joinedDate: "2024-05-22",
    status: "Active",
    attractionManagementEnabled: false,
    attractionPermissions: [],
  },
  {
    id: "MGR-106",
    name: "Deepak Patel",
    email: "deepak.patel@gmail.com",
    phone: "9543210987",
    password: "manager123",
    attraction: "Main Entrance",
    joinedDate: "2024-06-11",
    status: "Inactive",
    attractionManagementEnabled: false,
    attractionPermissions: [],
  },
];

/** Find a manager by email from the in-memory demo list (no localStorage) */
export function findManagerByEmail(email: string): StoredManager | undefined {
  return DEMO_MANAGERS.find(
    (m) => m.email.toLowerCase() === email.toLowerCase()
  );
}

// ─── Session helpers (sessionStorage — cleared on tab close) ──────────────────

/** Save a manager session after login */
export function saveManagerSession(manager: StoredManager): void {
  if (typeof window === "undefined") return;
  const { password: _pw, ...sessionData } = manager;
  sessionStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(sessionData));
}

/** Read the active manager session */
export function getManagerSession(): Omit<StoredManager, "password"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MANAGER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear the manager session on logout */
export function clearManagerSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MANAGER_SESSION_KEY);
}

/**
 * Derive the allowed sidebar nav keys for a manager based on their permissions.
 * Returns a Set of module label strings that the manager may access.
 */
export function getManagerAllowedModules(
  session: Omit<StoredManager, "password"> | null
): Set<string> {
  const defaultModules = [
    "Dashboard",
    "Staff Management",
    "Bookings",
    "Transactions",
    "Invoices",
    "Inventory / Capacity",
    "Reports",
  ];

  const baseModules = (session && session.allowedModules && session.allowedModules.length > 0)
    ? ["Dashboard", ...session.allowedModules]
    : defaultModules;

  const allowed = new Set<string>(baseModules);

  if (session && session.attractionManagementEnabled) {
    allowed.add("Attraction Management");
    for (const perm of session.attractionPermissions || []) {
      for (const mod of perm.modules || []) {
        allowed.add(mod);
      }
    }
  }

  return allowed;
}

/**
 * Helper to get the list of attraction IDs assigned to the current session user.
 * If userRole is "Admin", returns null (meaning ALL attractions accessible).
 * If userRole is "Manager", returns array of assigned attraction IDs (defaults to 2 mock attractions ATR-001 & ATR-002 if unspecified).
 */
export function getAssignedAttractionIds(userRole?: string): string[] | null {
  const role =
    userRole ??
    (typeof window !== "undefined"
      ? sessionStorage.getItem("userRole")
      : null) ??
    "Admin";

  if (role === "Admin") return null; // Admin has no restriction

  if (role === "Manager") {
    const session = getManagerSession();
    if (
      session &&
      session.attractionPermissions &&
      session.attractionPermissions.length > 0
    ) {
      return session.attractionPermissions.map((p) => p.attractionId);
    }
    // Default mock data: 2 attractions assigned to Manager (Toy Train ATR-001 & Ropeway ATR-002)
    return ["ATR-001", "ATR-002"];
  }

  return null;
}

/**
 * Filter an array of attractions based on the user's role.
 * Admin sees ALL attractions created by admin.
 * Manager sees ONLY the 2 attractions assigned to them by admin.
 */
export function filterAttractionsByRole<T extends { id: string; name?: string }>(
  allAttractions: T[],
  userRole?: string
): T[] {
  const assignedIds = getAssignedAttractionIds(userRole);
  if (!assignedIds) return allAttractions; // Admin sees all

  return allAttractions.filter((att) => assignedIds.includes(att.id));
}

