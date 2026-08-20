import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  numeric,
  integer,
  time,
  unique,
  date,
  boolean,
} from "drizzle-orm/pg-core";

import { AnyPgColumn } from "drizzle-orm/pg-core";
/* =========================================================
   ENUMS
========================================================= */

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MANAGER", "STAFF"]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
]);

export const attractionStatusEnum = pgEnum("attraction_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const moduleStatusEnum = pgEnum("module_status", ["ACTIVE", "INACTIVE"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "CASH",
  "UPI",
  "CARD",
  "ONLINE",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "SUCCESSFUL",
  "PENDING",
  "CANCELLED",
  "FAILED",
]);

export const seatLayoutStatusEnum = pgEnum("seat_layout_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const complimentaryPassStatusEnum = pgEnum("complimentary_pass_status", [
  "ACTIVE",
  "USED",
  "EXPIRED",
]);

export const referenceStatusEnum = pgEnum("reference_status", [
  "ACTIVE",
  "INACTIVE",
]);

/* =========================================================
   USERS
========================================================= */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    adminId: uuid("admin_id").references((): AnyPgColumn => users.id, {
      onDelete: "cascade",
    }),

    managerId: uuid("manager_id").references((): AnyPgColumn => users.id, {
      onDelete: "cascade",
    }),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    email: varchar("email", {
      length: 255,
    })
      .notNull()
      .unique(),

    passwordHash: varchar("password_hash", {
      length: 255,
    }).notNull(),

    role: userRoleEnum("role").notNull().default("STAFF"),

    status: userStatusEnum("status").notNull().default("ACTIVE"),

    phone: varchar("phone", {
      length: 20,
    }),

    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),

    roleIdx: index("users_role_idx").on(table.role),

    adminIdx: index("users_admin_idx").on(table.adminId),
  }),
);
export const staffRoles = pgTable(
  "staff_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    staffId: uuid("staff_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    role: varchar("role", {
      length: 100,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    staffIdx: index("staff_roles_staff_idx").on(table.staffId),
  }),
);

export const staffAttractionAssignments = pgTable(
  "staff_attraction_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    staffId: uuid("staff_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    staffIdx: index("staff_attraction_staff_idx").on(table.staffId),
    attractionIdx: index("staff_attraction_attraction_idx").on(
      table.attractionId,
    ),
  }),
);

/* =========================================================
   SESSIONS
========================================================= */

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    tokenHash: varchar("token_hash", {
      length: 64,
    })
      .notNull()
      .unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),

    tokenIdx: index("sessions_token_idx").on(table.tokenHash),
  }),
);

/* =========================================================
   PASSWORD RESET TOKENS
========================================================= */

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    tokenHash: varchar("token_hash", {
      length: 64,
    })
      .notNull()
      .unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    usedAt: timestamp("used_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    userIdx: index("password_reset_user_idx").on(table.userId),

    tokenIdx: index("password_reset_token_idx").on(table.tokenHash),
  }),
);

/* =========================================================
   AUDIT LOGS
========================================================= */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    action: varchar("action", {
      length: 100,
    }).notNull(),

    entity: varchar("entity", {
      length: 100,
    }),

    entityId: varchar("entity_id", {
      length: 100,
    }),

    ipAddress: varchar("ip_address", {
      length: 100,
    }),

    userAgent: text("user_agent"),

    metadata: text("metadata"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    userIdx: index("audit_user_idx").on(table.userId),

    createdIdx: index("audit_created_idx").on(table.createdAt),
  }),
);

/* =========================================================
   ATTRACTIONS
========================================================= */

export const attractions = pgTable(
  "attractions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    type: varchar("type", {
      length: 100,
    }).notNull(),

    status: attractionStatusEnum("status").notNull().default("ACTIVE"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    nameIdx: index("attractions_name_idx").on(table.name),
    adminIdx: index("attractions_admin_idx").on(table.adminId),
    statusIdx: index("attractions_status_idx").on(table.status),
  }),
);

/* =========================================================
   BOOKINGS
========================================================= */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingNumber: varchar("booking_number", {
      length: 50,
    })
      .notNull()
      .unique(),

    customerName: varchar("customer_name", {
      length: 150,
    }).notNull(),

    mobileNumber: varchar("mobile_number", {
      length: 20,
    }).notNull(),

    gstNumber: varchar("gst_number", {
      length: 20,
    }),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "restrict",
      }),

    visitAt: timestamp("visit_at", {
      withTimezone: true,
    }).notNull(),

    paymentMode: paymentModeEnum("payment_mode").notNull(),

    status: bookingStatusEnum("status").notNull().default("PENDING"),

    totalAmount: numeric("total_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    amountPaid: numeric("amount_paid", {
      precision: 12,
      scale: 2,
    }).notNull(),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    bookingNumberIdx: index("bookings_booking_number_idx").on(
      table.bookingNumber,
    ),

    customerNameIdx: index("bookings_customer_name_idx").on(table.customerName),

    mobileIdx: index("bookings_mobile_idx").on(table.mobileNumber),

    attractionIdx: index("bookings_attraction_idx").on(table.attractionId),

    visitAtIdx: index("bookings_visit_at_idx").on(table.visitAt),

    statusIdx: index("bookings_status_idx").on(table.status),
  }),
);

/* =========================================================
   BOOKING ITEMS
========================================================= */

export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, {
        onDelete: "cascade",
      }),

    category: varchar("category", {
      length: 100,
    }).notNull(),

    quantity: integer("quantity").notNull(),

    unitPrice: numeric("unit_price", {
      precision: 12,
      scale: 2,
    }).notNull(),

    totalPrice: numeric("total_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
  },

  (table) => ({
    bookingIdx: index("booking_items_booking_idx").on(table.bookingId),
  }),
);

/* =========================================================
   BOOKING SEATS
========================================================= */

export const bookingSeats = pgTable(
  "booking_seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, {
        onDelete: "cascade",
      }),

    bogie: varchar("bogie", {
      length: 50,
    }),

    seatNumber: varchar("seat_number", {
      length: 50,
    }).notNull(),
  },

  (table) => ({
    bookingIdx: index("booking_seats_booking_idx").on(table.bookingId),
  }),
);

/* =========================================================
   SYSTEM MODULES
========================================================= */

export const systemModules = pgTable(
  "system_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    key: varchar("key", {
      length: 100,
    })
      .notNull()
      .unique(),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    description: text("description"),

    isActive: moduleStatusEnum("is_active").notNull().default("ACTIVE"),
    sortOrder: integer("sort_order"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    keyIdx: index("system_modules_key_idx").on(table.key),
  }),
);

/* =========================================================
   ATTRACTION MODULES
========================================================= */

export const attractionModules = pgTable(
  "attraction_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    key: varchar("key", {
      length: 100,
    }).notNull(),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    description: text("description"),

    isActive: moduleStatusEnum("is_active").notNull().default("ACTIVE"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    attractionIdx: index("attraction_modules_attraction_idx").on(
      table.attractionId,
    ),

    keyIdx: index("attraction_modules_key_idx").on(table.key),
  }),
);

/* =========================================================
   MANAGER → SYSTEM MODULE PERMISSIONS
========================================================= */

export const managerSystemModulePermissions = pgTable(
  "manager_system_module_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    moduleId: uuid("module_id")
      .notNull()
      .references(() => systemModules.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    managerIdx: index("manager_system_permissions_manager_idx").on(
      table.managerId,
    ),

    moduleIdx: index("manager_system_permissions_module_idx").on(
      table.moduleId,
    ),

    uniquePermission: uniqueIndex("manager_system_module_unique").on(
      table.managerId,
      table.moduleId,
    ),
  }),
);

/* =========================================================
   MANAGER → ATTRACTION PERMISSIONS
========================================================= */

export const managerAttractionPermissions = pgTable(
  "manager_attraction_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    managerIdx: index("manager_attraction_permissions_manager_idx").on(
      table.managerId,
    ),

    attractionIdx: index("manager_attraction_permissions_attraction_idx").on(
      table.attractionId,
    ),

    uniquePermission: uniqueIndex("manager_attraction_unique").on(
      table.managerId,
      table.attractionId,
    ),
  }),
);

/* =========================================================
   MANAGER → ATTRACTION MODULE PERMISSIONS
========================================================= */

export const managerAttractionModulePermissions = pgTable(
  "manager_attraction_module_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    attractionModuleId: uuid("attraction_module_id")
      .notNull()
      .references(() => attractionModules.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    managerIdx: index("manager_attraction_module_permissions_manager_idx").on(
      table.managerId,
    ),

    moduleIdx: index("manager_attraction_module_permissions_module_idx").on(
      table.attractionModuleId,
    ),

    uniquePermission: uniqueIndex("manager_attraction_module_unique").on(
      table.managerId,
      table.attractionModuleId,
    ),
  }),
);

/* =========================================================
   TRANSACTIONS
========================================================= */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    transactionNumber: varchar("transaction_number", {
      length: 50,
    })
      .notNull()
      .unique(),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, {
        onDelete: "restrict",
      }),

    invoiceNumber: varchar("invoice_number", {
      length: 50,
    }),

    amount: numeric("amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    paymentMode: paymentModeEnum("payment_mode").notNull(),

    status: transactionStatusEnum("status").notNull().default("SUCCESSFUL"),

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    transactionNumberIdx: index("transactions_transaction_number_idx").on(
      table.transactionNumber,
    ),

    bookingIdx: index("transactions_booking_idx").on(table.bookingId),

    paymentModeIdx: index("transactions_payment_mode_idx").on(
      table.paymentMode,
    ),

    statusIdx: index("transactions_status_idx").on(table.status),

    createdAtIdx: index("transactions_created_at_idx").on(table.createdAt),

    deletedAtIdx: index("transactions_deleted_at_idx").on(table.deletedAt),
  }),
);

export const attractionInventory = pgTable(
  "attraction_inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    inventoryDate: date("inventory_date").notNull(),

    dailyCapacity: integer("daily_capacity").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    attractionDateUnique: unique(
      "attraction_inventory_attraction_date_unique",
    ).on(table.attractionId, table.inventoryDate),
  }),
);

export const attractionInventorySlots = pgTable(
  "attraction_inventory_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => attractionInventory.id, {
        onDelete: "cascade",
      }),

    slotTime: time("slot_time").notNull(),

    capacity: integer("capacity").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    inventorySlotUnique: unique("attraction_inventory_slot_unique").on(
      table.inventoryId,
      table.slotTime,
    ),
  }),
);

/* =========================================================
   ATTRACTION TIME SLOTS
========================================================= */

export const attractionTimeSlots = pgTable(
  "attraction_time_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    slotTime: time("slot_time").notNull(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    attractionIdx: index("attraction_time_slots_attraction_idx").on(
      table.attractionId,
    ),

    uniqueAttractionSlot: uniqueIndex(
      "attraction_time_slots_attraction_slot_unique",
    ).on(table.attractionId, table.slotTime),
  }),
);

/* =========================================================
   ATTRACTION DAILY CAPACITY
========================================================= */

export const attractionDailyCapacities = pgTable(
  "attraction_daily_capacities",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    capacityDate: date("capacity_date").notNull(),

    totalCapacity: integer("total_capacity").notNull().default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    attractionIdx: index("attraction_daily_capacity_attraction_idx").on(
      table.attractionId,
    ),

    dateIdx: index("attraction_daily_capacity_date_idx").on(table.capacityDate),

    uniqueAttractionDate: uniqueIndex(
      "attraction_daily_capacity_attraction_date_unique",
    ).on(table.attractionId, table.capacityDate),
  }),
);

/* =========================================================
   ATTRACTION SLOT CAPACITY
========================================================= */

export const attractionSlotCapacities = pgTable(
  "attraction_slot_capacities",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    timeSlotId: uuid("time_slot_id")
      .notNull()
      .references(() => attractionTimeSlots.id, {
        onDelete: "cascade",
      }),

    capacityDate: date("capacity_date").notNull(),

    capacity: integer("capacity").notNull().default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    timeSlotIdx: index("attraction_slot_capacity_slot_idx").on(
      table.timeSlotId,
    ),

    dateIdx: index("attraction_slot_capacity_date_idx").on(table.capacityDate),

    uniqueSlotDate: uniqueIndex("attraction_slot_capacity_slot_date_unique").on(
      table.timeSlotId,
      table.capacityDate,
    ),
  }),
);

export const seatLayouts = pgTable(
  "seat_layouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // --------------------------------------------------
    // OWNER ADMIN
    // --------------------------------------------------

    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    rows: integer("rows").notNull(),

    cols: integer("cols").notNull(),

    hasAisle: boolean("has_aisle").notNull(),

    aisleAfterCol: integer("aisle_after_col").notNull().default(0),

    status: seatLayoutStatusEnum("status").notNull().default("ACTIVE"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    // --------------------------------------------------
    // INDEXES
    // --------------------------------------------------

    adminIdx: index("seat_layouts_admin_idx").on(table.adminId),

    nameIdx: index("seat_layouts_name_idx").on(table.name),

    statusIdx: index("seat_layouts_status_idx").on(table.status),
  }),
);

/* =========================================================
   ROLE → SYSTEM MODULE PERMISSIONS
========================================================= */

export const systemModuleRolePermissions = pgTable(
  "system_module_role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    role: userRoleEnum("role").notNull(),

    moduleId: uuid("module_id")
      .notNull()
      .references(() => systemModules.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    roleIdx: index("system_module_role_permissions_role_idx").on(table.role),

    moduleIdx: index("system_module_role_permissions_module_idx").on(
      table.moduleId,
    ),

    uniqueRoleModule: uniqueIndex(
      "system_module_role_permissions_role_module_unique",
    ).on(table.role, table.moduleId),
  }),
);

/* =========================================================
   STAFF → SYSTEM MODULE PERMISSIONS
========================================================= */

export const staffSystemModulePermissions = pgTable(
  "staff_system_module_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    staffId: uuid("staff_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    moduleId: uuid("module_id")
      .notNull()
      .references(() => systemModules.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    staffIdx: index("staff_system_module_permissions_staff_idx").on(
      table.staffId,
    ),

    moduleIdx: index("staff_system_module_permissions_module_idx").on(
      table.moduleId,
    ),

    uniqueStaffModule: uniqueIndex(
      "staff_system_module_permissions_staff_module_unique",
    ).on(table.staffId, table.moduleId),
  }),
);

export const attractionManagement = pgTable(
  "attraction_management",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "cascade",
      }),

    description: text("description"),

    image: text("image"),

    timing: varchar("timing", {
      length: 100,
    }),

    adultPrice: numeric("adult_price", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    childPrice: numeric("child_price", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    studentPrice: numeric("student_price", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    seniorPrice: numeric("senior_price", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    foreignerPrice: numeric("foreigner_price", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    hasSeating: boolean("has_seating").notNull().default(false),

    seatLayoutId: uuid("seat_layout_id").references(() => seatLayouts.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    adminIdx: index("attraction_management_admin_idx").on(table.adminId),

    attractionIdx: index("attraction_management_attraction_idx").on(
      table.attractionId,
    ),

    seatLayoutIdx: index("attraction_management_seat_layout_idx").on(
      table.seatLayoutId,
    ),

    uniqueAdminAttraction: uniqueIndex(
      "attraction_management_admin_attraction_unique",
    ).on(table.adminId, table.attractionId),
  }),
);

/* =========================================================
   CUSTOMERS
========================================================= */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // OWNER ADMIN
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    mobile: varchar("mobile", {
      length: 20,
    }).notNull(),

    gstn: varchar("gstn", {
      length: 20,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    isDeleted: boolean("is_deleted").notNull().default(false),
  },

  (table) => ({
    adminIdx: index("customers_admin_idx").on(table.adminId),

    mobileIdx: index("customers_mobile_idx").on(table.mobile),

    nameIdx: index("customers_name_idx").on(table.name),

    gstIdx: index("customers_gst_idx").on(table.gstn),

    uniqueAdminMobile: uniqueIndex("customers_admin_mobile_unique").on(
      table.adminId,
      table.mobile,
    ),
  }),
);

export const references = pgTable(
  "references",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    referenceName: varchar("reference_name", {
      length: 150,
    }).notNull(),

    department: varchar("department", {
      length: 100,
    }),

    contactPerson: varchar("contact_person", {
      length: 150,
    }).notNull(),

    post: varchar("post", {
      length: 100,
    }),

    mobile: varchar("mobile", {
      length: 20,
    }).notNull(),

    status: referenceStatusEnum("status").notNull().default("ACTIVE"),

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    adminIdx: index("references_admin_idx").on(table.adminId),

    mobileIdx: index("references_mobile_idx").on(table.mobile),

    deletedIdx: index("references_deleted_idx").on(table.isDeleted),
  }),
);

export const complimentaryPasses = pgTable(
  "complimentary_passes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // OWNER ADMIN
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    passId: varchar("pass_id", {
      length: 50,
    })
      .notNull()
      .unique(),

    visitorName: varchar("visitor_name", {
      length: 150,
    }).notNull(),

    mobile: varchar("mobile", {
      length: 20,
    }).notNull(),

    attractionId: uuid("attraction_id")
      .notNull()
      .references(() => attractions.id, {
        onDelete: "restrict",
      }),

    visitors: integer("visitors").notNull().default(1),

    referenceId: uuid("reference_id").references(() => references.id, {
      onDelete: "set null",
    }),

    status: complimentaryPassStatusEnum("status").notNull().default("ACTIVE"),

    visitDate: date("visit_date").notNull(),

    // Soft delete

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => ({
    adminIdx: index("complimentary_pass_admin_idx").on(table.adminId),

    attractionIdx: index("complimentary_pass_attraction_idx").on(
      table.attractionId,
    ),

    referenceIdx: index("complimentary_pass_reference_idx").on(
      table.referenceId,
    ),

    statusIdx: index("complimentary_pass_status_idx").on(table.status),

    deletedIdx: index("complimentary_pass_deleted_idx").on(table.isDeleted),
  }),
);

export const attractionManagementSeatLayouts = pgTable(
  "attraction_management_seat_layouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    attractionManagementId: uuid("attraction_management_id")
      .notNull()
      .references(() => attractionManagement.id, {
        onDelete: "cascade",
      }),

    seatLayoutId: uuid("seat_layout_id")
      .notNull()
      .references(() => seatLayouts.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    attractionSeatLayoutUnique: unique(
      "attraction_management_seat_layout_unique",
    ).on(table.attractionManagementId, table.seatLayoutId),

    attractionManagementIdx: index(
      "attraction_management_seat_layout_attraction_idx",
    ).on(table.attractionManagementId),

    seatLayoutIdx: index("attraction_management_seat_layout_layout_idx").on(
      table.seatLayoutId,
    ),
  }),
);
