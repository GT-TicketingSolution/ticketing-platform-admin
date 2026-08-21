/**
 * Central API Endpoints Definition
 * All endpoints.
 */

export const AppUrl = {
  // Authentication & Profile 
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
    getProfile: "/auth/profile",
    updateProfile: "/auth/profile",
  },

  // Admin Dashboard
  dashboard: {
    get: "/admin/dashboard",
  },

  // Manager Management — CRUD uses singular /admin/manager, permissions uses plural /admin/managers/:id/permissions
  manager: {
    list: "/admin/managers",
    create: "/admin/managers",
    get: (managerId: string) => `/admin/managers/${managerId}`,
    update: (managerId: string) => `/admin/managers/${managerId}`,
    disable: (managerId: string) => `/admin/managers/${managerId}`,
    delete: (managerId: string) => `/admin/managers/${managerId}`,
    getPermissions: (managerId: string) => `/admin/managers/${managerId}/permissions`,
    updatePermissions: (managerId: string) => `/admin/managers/${managerId}/permissions`,
  },

  // Staff Management
  staff: {
    list: "/admin/staff",
    create: "/admin/staff",
    get: (staffId: string) => `/admin/staff/${staffId}`,
    update: (staffId: string) => `/admin/staff/${staffId}`,
    disable: (staffId: string) => `/admin/staff/${staffId}/disable`,
    delete: (staffId: string) => `/admin/staff/${staffId}`,
  },

  // Booking Management
  booking: {
    list: "/admin/bookings",
    create: "/admin/bookings",
    get: (bookingId: string) => `/admin/bookings/${bookingId}`,
    update: (bookingId: string) => `/admin/bookings/${bookingId}`,
    delete: (bookingId: string) => `/admin/bookings/${bookingId}`,
  },

  // Transaction Management
  transaction: {
    list: "/admin/transactions",
    get: (transactionId: string) => `/admin/transactions/${transactionId}`,
    delete: (transactionId: string) => `/admin/transactions/${transactionId}`,
  },

  // Invoice Management
  invoice: {
    list: "/admin/invoices",
    get: (invoiceId: string) => `/admin/invoices/${invoiceId}`,
    delete: (invoiceId: string) => `/admin/invoices/${invoiceId}`,
  },

  // System Modules
  systemModule: {
    list: "/admin/system-modules",
  },

  // Attraction Management CRUD
  attractionManagement: {
    list: "/admin/attraction-management",
    create: "/admin/attraction-management",
    bulk: "/admin/attraction-management/bulk",
    update: (id: string) => `/admin/attraction-management/${id}`,
    delete: (id: string) => `/admin/attraction-management/${id}`,
    assignSeat: (id: string) => `/admin/attraction-management/${id}/seat`,
  },

  // Seat Layout Management
  seat: {
    list: "/admin/seats",
    create: "/admin/seats",
    get: (seatId: string) => `/admin/seats/${seatId}`,
    update: (seatId: string) => `/admin/seats/${seatId}`,
    delete: (seatId: string) => `/admin/seats/${seatId}`,
  },

  // Inventory Management
  inventory: {
    list: "/admin/inventory",
    upsert: "/admin/inventory",
    capacity: "/admin/inventory/capacity",
  },

  // Customer Management
  customer: {
    list: "/admin/customers",
    create: "/admin/customers",
    update: (id: string) => `/admin/customers/${id}`,
    delete: (id: string) => `/admin/customers/${id}`,
  },

  // Complimentary Passes
  complimentaryPass: {
    list: "/admin/complimentary-passes",
    create: "/admin/complimentary-passes",
    update: (id: string) => `/admin/complimentary-passes/${id}`,
    delete: (id: string) => `/admin/complimentary-passes/${id}`,
  },

  // References Master Data
  reference: {
    list: "/admin/references",
    create: "/admin/references",
    update: (id: string) => `/admin/references/${id}`,
    delete: (id: string) => `/admin/references/${id}`,
  },

  // Reports
  reports: {
    summary: "/admin/reports/summary",
    attraction: "/admin/reports/attractions",
    attractions: "/admin/reports/attractions",
    payment: "/admin/reports/payment",
    tickets: "/admin/reports/tickets",
  },
} as const;

export default AppUrl;
