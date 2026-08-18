// import { and, eq, isNull } from "drizzle-orm";

// import { db } from "@/db";

// import { transactions, bookings, attractions } from "@/db/schema";

// import { requireAuth } from "@/lib/auth/require-auth";
// import { success, failure } from "@/lib/api/response";

// // =====================================================
// // GET TRANSACTION DETAILS
// // =====================================================

// export async function GET(
//   request: Request,
//   {
//     params,
//   }: {
//     params: Promise<{
//       transactionId: string;
//     }>;
//   },
// ) {
//   try {
//     // ---------------------------------------------
//     // Authentication
//     // ---------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     // ---------------------------------------------
//     // Transaction ID
//     // ---------------------------------------------

//     const { transactionId } = await params;

//     if (!transactionId) {
//       return failure(
//         "Transaction ID is required.",
//         400,
//         "TRANSACTION_ID_REQUIRED",
//       );
//     }

//     // ---------------------------------------------
//     // Get transaction
//     // ---------------------------------------------

//     const [transaction] = await db
//       .select({
//         id: transactions.id,

//         transactionId: transactions.transactionNumber,

//         invoiceNumber: transactions.invoiceNumber,

//         amount: transactions.amount,

//         paymentMode: transactions.paymentMode,

//         status: transactions.status,

//         transactionDate: transactions.createdAt,

//         updatedAt: transactions.updatedAt,

//         bookingId: bookings.id,

//         bookingNumber: bookings.bookingNumber,

//         customerName: bookings.customerName,

//         mobileNumber: bookings.mobileNumber,

//         gstNumber: bookings.gstNumber,

//         attractionId: attractions.id,

//         attractionName: attractions.name,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .leftJoin(attractions, eq(bookings.attractionId, attractions.id))
//       .where(
//         and(
//           eq(transactions.id, transactionId),
//           isNull(transactions.deletedAt),
//           isNull(bookings.deletedAt),
//         ),
//       )
//       .limit(1);

//     // ---------------------------------------------
//     // Transaction not found
//     // ---------------------------------------------

//     if (!transaction) {
//       return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
//     }

//     // ---------------------------------------------
//     // Response
//     // ---------------------------------------------

//     return success({
//       transaction: {
//         id: transaction.id,

//         transactionId: transaction.transactionId,

//         invoiceNumber: transaction.invoiceNumber,

//         booking: {
//           id: transaction.bookingId,

//           bookingId: transaction.bookingNumber,
//         },

//         customer: {
//           name: transaction.customerName,

//           mobile: transaction.mobileNumber,

//           gstNumber: transaction.gstNumber,
//         },

//         attraction: transaction.attractionId
//           ? {
//               id: transaction.attractionId,

//               name: transaction.attractionName,
//             }
//           : null,

//         transactionDate: transaction.transactionDate,

//         payment: {
//           mode: transaction.paymentMode,

//           amount: Number(transaction.amount),

//           status: transaction.status,
//         },

//         createdAt: transaction.transactionDate,

//         updatedAt: transaction.updatedAt,
//       },
//     });
//   } catch (error) {
//     console.error("Get transaction details error:", error);

//     return failure(
//       "Unable to fetch transaction details.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }

// // =====================================================
// // DELETE TRANSACTION
// // =====================================================

// export async function DELETE(
//   request: Request,
//   {
//     params,
//   }: {
//     params: Promise<{
//       transactionId: string;
//     }>;
//   },
// ) {
//   try {
//     // ---------------------------------------------
//     // Authentication
//     // ---------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     // ---------------------------------------------
//     // Transaction ID
//     // ---------------------------------------------

//     const { transactionId } = await params;

//     if (!transactionId) {
//       return failure(
//         "Transaction ID is required.",
//         400,
//         "TRANSACTION_ID_REQUIRED",
//       );
//     }

//     // ---------------------------------------------
//     // Find transaction
//     // ---------------------------------------------

//     const [existingTransaction] = await db
//       .select({
//         id: transactions.id,

//         transactionId: transactions.transactionNumber,

//         deletedAt: transactions.deletedAt,
//       })
//       .from(transactions)
//       .where(eq(transactions.id, transactionId))
//       .limit(1);

//     // ---------------------------------------------
//     // Not found
//     // ---------------------------------------------

//     if (!existingTransaction) {
//       return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
//     }

//     // ---------------------------------------------
//     // Already deleted
//     // ---------------------------------------------

//     if (existingTransaction.deletedAt) {
//       return failure(
//         "Transaction is already deleted.",
//         400,
//         "TRANSACTION_ALREADY_DELETED",
//       );
//     }

//     // ---------------------------------------------
//     // Soft delete
//     // ---------------------------------------------

//     const [deletedTransaction] = await db
//       .update(transactions)
//       .set({
//         deletedAt: new Date(),
//         updatedAt: new Date(),
//       })
//       .where(eq(transactions.id, transactionId))
//       .returning({
//         id: transactions.id,

//         transactionId: transactions.transactionNumber,

//         deletedAt: transactions.deletedAt,
//       });

//     // ---------------------------------------------
//     // Response
//     // ---------------------------------------------

//     return success({
//       message: "Transaction deleted successfully.",

//       transaction: deletedTransaction,
//     });
//   } catch (error) {
//     console.error("Delete transaction error:", error);

//     return failure(
//       "Unable to delete transaction.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";

import {
  transactions,
  bookings,
  attractions,
  managerAttractionPermissions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

// =====================================================
// GET TRANSACTION DETAILS
// ADMIN + MANAGER
// =====================================================

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      transactionId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    const user = auth.user;

    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return failure("Admin or Manager access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Resolve tenant
    // ---------------------------------------------

    const adminId = user.role === "ADMIN" ? user.id : user.adminId;

    if (!adminId) {
      return failure(
        "Unable to determine account owner.",
        403,
        "TENANT_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // Transaction ID
    // ---------------------------------------------

    const { transactionId } = await params;

    if (!transactionId) {
      return failure(
        "Transaction ID is required.",
        400,
        "TRANSACTION_ID_REQUIRED",
      );
    }

    // =================================================
    // MANAGER ATTRACTIONS
    // =================================================

    let allowedAttractionIds: string[] = [];

    if (user.role === "MANAGER") {
      const managerAttractions = await db
        .select({
          attractionId: managerAttractionPermissions.attractionId,
        })
        .from(managerAttractionPermissions)
        .innerJoin(
          attractions,
          eq(managerAttractionPermissions.attractionId, attractions.id),
        )
        .where(
          and(
            eq(managerAttractionPermissions.managerId, user.id),
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      allowedAttractionIds = managerAttractions.map(
        (item) => item.attractionId,
      );

      if (allowedAttractionIds.length === 0) {
        return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
      }
    }

    // =================================================
    // GET TRANSACTION
    // =================================================

    const [transaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        invoiceNumber: transactions.invoiceNumber,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        transactionDate: transactions.createdAt,

        updatedAt: transactions.updatedAt,

        bookingId: bookings.id,

        bookingNumber: bookings.bookingNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        attractionId: attractions.id,

        attractionName: attractions.name,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(
        and(
          eq(transactions.id, transactionId),

          isNull(transactions.deletedAt),

          isNull(bookings.deletedAt),

          // Tenant isolation
          eq(attractions.adminId, adminId),

          // Manager isolation
          ...(user.role === "MANAGER"
            ? [inArray(attractions.id, allowedAttractionIds)]
            : []),
        ),
      )
      .limit(1);

    // ---------------------------------------------
    // Not found
    // ---------------------------------------------

    if (!transaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // =================================================
    // RESPONSE
    // =================================================

    return success({
      transaction: {
        id: transaction.id,

        transactionId: transaction.transactionId,

        invoiceNumber: transaction.invoiceNumber,

        booking: {
          id: transaction.bookingId,

          bookingId: transaction.bookingNumber,
        },

        customer: {
          name: transaction.customerName,

          mobile: transaction.mobileNumber,

          gstNumber: transaction.gstNumber,
        },

        attraction: {
          id: transaction.attractionId,

          name: transaction.attractionName,
        },

        transactionDate: transaction.transactionDate,

        payment: {
          mode: transaction.paymentMode,

          amount: Number(transaction.amount),

          status: transaction.status,
        },

        createdAt: transaction.transactionDate,

        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get transaction details error:", error);

    return failure(
      "Unable to fetch transaction details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// =====================================================
// DELETE TRANSACTION
// ADMIN ONLY
// =====================================================

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      transactionId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const adminId = auth.user.id;

    // ---------------------------------------------
    // Transaction ID
    // ---------------------------------------------

    const { transactionId } = await params;

    if (!transactionId) {
      return failure(
        "Transaction ID is required.",
        400,
        "TRANSACTION_ID_REQUIRED",
      );
    }

    // =================================================
    // FIND TRANSACTION
    // =================================================

    const [existingTransaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        deletedAt: transactions.deletedAt,

        attractionId: attractions.id,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(
        and(
          eq(transactions.id, transactionId),

          eq(attractions.adminId, adminId),
        ),
      )
      .limit(1);

    // ---------------------------------------------
    // Not found
    // ---------------------------------------------

    if (!existingTransaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // ---------------------------------------------
    // Already deleted
    // ---------------------------------------------

    if (existingTransaction.deletedAt) {
      return failure(
        "Transaction is already deleted.",
        400,
        "TRANSACTION_ALREADY_DELETED",
      );
    }

    // =================================================
    // SOFT DELETE
    // =================================================

    const [deletedTransaction] = await db
      .update(transactions)
      .set({
        deletedAt: new Date(),

        deletedBy: auth.user.id,

        isDeleted: true,

        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, transactionId)))
      .returning({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        deletedAt: transactions.deletedAt,
      });

    // =================================================
    // RESPONSE
    // =================================================

    return success({
      message: "Transaction deleted successfully.",

      transaction: deletedTransaction,
    });
  } catch (error) {
    console.error("Delete transaction error:", error);

    return failure(
      "Unable to delete transaction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
