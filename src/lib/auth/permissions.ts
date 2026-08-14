export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  ATTRACTION_VIEW: "attraction.view",

  ATTRACTION_MANAGE: "attraction.manage",

  BOOKINGS_VIEW: "bookings.view",

  BOOKINGS_MANAGE: "bookings.manage",

  CCTV_VIEW: "cctv.view",

  COMPLEMENTARY_PASSES_VIEW: "complimentary_passes.view",

  COMPLEMENTARY_PASSES_MANAGE: "complimentary_passes.manage",

  CUSTOMER_VIEW: "customer.view",

  CUSTOMER_MANAGE: "customer.manage",

  INVENTORY_VIEW: "inventory.view",

  INVENTORY_MANAGE: "inventory.manage",

  INVOICES_VIEW: "invoices.view",

  INVOICES_MANAGE: "invoices.manage",

  REPORTS_VIEW: "reports.view",

  SCANNER_USE: "scanner.use",

  TICKET_BOOKING: "ticket_booking.create",

  TRANSACTIONS_VIEW: "transactions.view",

  STAFF_VIEW: "staff.view",

  STAFF_MANAGE: "staff.manage",

  MANAGER_VIEW: "manager.view",

  MANAGER_MANAGE: "manager.manage",

  USER_VIEW: "user.view",

  USER_MANAGE: "user.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),

  MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.ATTRACTION_VIEW,
    PERMISSIONS.ATTRACTION_MANAGE,

    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.BOOKINGS_MANAGE,

    PERMISSIONS.CCTV_VIEW,

    PERMISSIONS.COMPLEMENTARY_PASSES_VIEW,
    PERMISSIONS.COMPLEMENTARY_PASSES_MANAGE,

    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_MANAGE,

    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_MANAGE,

    PERMISSIONS.REPORTS_VIEW,

    PERMISSIONS.SCANNER_USE,

    PERMISSIONS.TRANSACTIONS_VIEW,

    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_MANAGE,
  ],

  STAFF: [
    PERMISSIONS.TICKET_BOOKING,

    PERMISSIONS.BOOKINGS_VIEW,

    PERMISSIONS.CUSTOMER_VIEW,

    PERMISSIONS.SCANNER_USE,
  ],
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
