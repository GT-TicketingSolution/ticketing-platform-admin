import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  isNotNull,
} from "drizzle-orm";

import { db } from "@/db";
import {
  transactions,
  bookings,
  bookingItems,
  attractions,
  users,
} from "@/db/schema";

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const [user] = await db
    .select({
      role: users.role,
      admin_id: users.adminId,
      invoicePrefix: users.invoiceNumberForUsersInitialPart,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.role === "STAFF" && user.admin_id) {
      const [admin] = await db
        .select({
          invoiceNumberForUsersInitialPart: users.invoiceNumberForUsersInitialPart,
        })
        .from(users)
        .where(eq(users.id, user.admin_id))
        .limit(1);
  
      if (admin) {
        user.invoicePrefix = admin.invoiceNumberForUsersInitialPart;
      }
    }

  if (!user.invoicePrefix) {
    throw new Error("INVOICE_PREFIX_NOT_CONFIGURED");
  }

  const [lastTransaction] = await db
    .select({
      invoiceNumber: transactions.invoiceNumber,
    })
    .from(transactions)
    .where(isNotNull(transactions.invoiceNumber))
    .orderBy(desc(transactions.createdAt))
    .limit(1);

  let nextNumber = 1;

  if (lastTransaction?.invoiceNumber) {
    const match = lastTransaction.invoiceNumber.match(/(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `${user.invoicePrefix}${String(nextNumber).padStart(5, "0")}`;
}
