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
    disable: (staffId: string) => `/admin/staff/${staffId}`,
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

  // System Modules
  systemModule: {
    list: "/admin/system-modules",
  },

  // Attractions Management
  attraction: {
    list: "/admin/attractions",
    getModules: (attractionId: string) => `/admin/attractions/${attractionId}/modules`,
  },
} as const;

export default AppUrl;
