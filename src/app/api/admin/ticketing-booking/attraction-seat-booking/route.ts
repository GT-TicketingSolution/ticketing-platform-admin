// // // import { NextRequest } from "next/server";
// // // import { z } from "zod";

// // // import { db } from "@/db";
// // // import { seatBookingHistory } from "@/db/schema";

// // // import { failure, success } from "@/lib/api/response";
// // // import { requireAuth } from "@/lib/auth/require-auth";
// // // import { requireModuleAccess } from "@/lib/auth/authorization";

// // // const createSeatBookingHistorySchema = z.object({
// // //   bookings: z
// // //     .array(
// // //       z.object({
// // //         attractionId: z.string().uuid("Invalid attraction ID"),

// // //         tripNo: z
// // //           .number()
// // //           .int("Trip number must be an integer")
// // //           .nonnegative("Trip number cannot be negative"),

// // //         attractionSeatId: z.string().uuid("Invalid attraction seat ID"),

// // //         seatNo: z
// // //           .string()
// // //           .trim()
// // //           .min(1, "Seat number is required")
// // //           .max(100, "Seat number cannot exceed 100 characters"),
// // //       }),
// // //     )
// // //     .min(1, "At least one booking is required"),
// // // });

// // // export async function POST(request: NextRequest) {
// // //   try {
// // //     const auth = await requireAuth(request);

// // //     await requireModuleAccess(auth, "TICKET_BOOKING");

// // //     let body: unknown;

// // //     try {
// // //       body = await request.json();
// // //     } catch {
// // //       return failure(
// // //         "Request body must contain valid JSON",
// // //         400,
// // //         "INVALID_JSON",
// // //       );
// // //     }

// // //     const validation = createSeatBookingHistorySchema.safeParse(body);

// // //     if (!validation.success) {
// // //       return failure(
// // //         validation.error.issues[0]?.message ?? "Invalid request data",
// // //         400,
// // //         "VALIDATION_ERROR",
// // //       );
// // //     }

// // //     const { bookings } = validation.data;

// // //     const insertedBookings = await db.insert(seatBookingHistory).values(
// // //       bookings.map((booking) => ({
// // //         attractionId: booking.attractionId,
// // //         tripNo: booking.tripNo,
// // //         attractionSeatId: booking.attractionSeatId,
// // //         seatNo: booking.seatNo,
// // //       })),
// // //     );

// // //     return success(
// // //       {
// // //         message: "Seat bookings created successfully",
// // //       },
// // //       201,
// // //     );
// // //   } catch (error) {
// // //     console.error(
// // //       "POST /api/admin/ticketing-booking/seat-booking-history error:",
// // //       error,
// // //     );

// // //     return failure(
// // //       "Unable to create seat booking history",
// // //       500,
// // //       "INTERNAL_SERVER_ERROR",
// // //     );
// // //   }
// // // }
// // import { NextRequest } from "next/server";
// // import { z } from "zod";

// // import { db } from "@/db";
// // import { seatBookingHistory } from "@/db/schema";

// // import { failure, success } from "@/lib/api/response";
// // import { requireAuth } from "@/lib/auth/require-auth";
// // import { requireModuleAccess } from "@/lib/auth/authorization";

// // const createSeatBookingHistorySchema = z.object({
// //   bookings: z
// //     .array(
// //       z.object({
// //         attractionId: z.string().uuid("Invalid attraction ID"),

// //         tripNo: z
// //           .number()
// //           .int("Trip number must be an integer")
// //           .nonnegative("Trip number cannot be negative"),

// //         attractionSeatId: z.string().uuid("Invalid attraction seat ID"),

// //         seatNo: z
// //           .string()
// //           .trim()
// //           .min(1, "Seat number is required")
// //           .max(100, "Seat number cannot exceed 100 characters"),
// //       }),
// //     )
// //     .min(1, "At least one booking is required"),
// // });

// // export async function POST(request: NextRequest) {
// //   try {
// //     // Authentication
// //     const auth = await requireAuth(request);

// //     // Authorization
// //     await requireModuleAccess(auth, "TICKET_BOOKING");

// //     // Parse request body
// //     let body: unknown;

// //     try {
// //       body = await request.json();
// //     } catch {
// //       return failure(
// //         "Request body must contain valid JSON",
// //         400,
// //         "INVALID_JSON",
// //       );
// //     }

// //     // Validate request body
// //     const validation = createSeatBookingHistorySchema.safeParse(body);

// //     if (!validation.success) {
// //       return failure(
// //         validation.error.issues[0]?.message ?? "Invalid request data",
// //         400,
// //         "VALIDATION_ERROR",
// //       );
// //     }

// //     const { bookings } = validation.data;

// //     // Insert seat booking history
// //     await db.insert(seatBookingHistory).values(
// //       bookings.map((booking) => ({
// //         attractionId: booking.attractionId,
// //         tripNo: booking.tripNo,
// //         attractionSeatId: booking.attractionSeatId,
// //         seatNo: booking.seatNo,
// //       })),
// //     );

// //     // Success response
// //     return success(
// //       {
// //         message: "Seat bookings created successfully",
// //       },
// //       201,
// //     );
// //   } catch (error) {
// //     console.error(
// //       "POST /api/admin/ticketing-booking/seat-booking-history error:",
// //       error,
// //     );

// //     // Handle known application errors
// //     if (
// //       error &&
// //       typeof error === "object" &&
// //       "status" in error &&
// //       "code" in error
// //     ) {
// //       const err = error as {
// //         status: number;
// //         code: string;
// //         message?: string;
// //       };

// //       return failure(err.message ?? "Request failed", err.status, err.code);
// //     }

// //     // Handle unexpected errors
// //     return failure(
// //       "Unable to create seat booking history",
// //       500,
// //       "INTERNAL_SERVER_ERROR",
// //     );
// //   }
// // }
// import { NextRequest } from "next/server";
// import { z } from "zod";

// import { db } from "@/db";
// import { seatBookingHistory } from "@/db/schema";

// import { failure, success } from "@/lib/api/response";
// import { requireAuth } from "@/lib/auth/require-auth";
// import { requireModuleAccess } from "@/lib/auth/authorization";

// const createSeatBookingHistorySchema = z.object({
//   bookings: z
//     .array(
//       z.object({
//         attractionId: z.string().uuid("Invalid attraction ID"),

//         tripNo: z
//           .number()
//           .int("Trip number must be an integer")
//           .nonnegative("Trip number cannot be negative"),

//         attractionSeatId: z.string().uuid("Invalid attraction seat ID"),

//         seatNo: z
//           .number()
//           .int("Seat number must be an integer")
//           .positive("Seat number must be greater than 0"),
//       }),
//     )
//     .min(1, "At least one booking is required"),
// });

// export async function POST(request: NextRequest) {
//   try {
//     // Authentication
//     const auth = await requireAuth(request);

//     // Authorization
//     await requireModuleAccess(auth, "TICKET_BOOKING");

//     // Parse request body
//     let body: unknown;

//     try {
//       body = await request.json();
//     } catch {
//       return failure(
//         "Request body must contain valid JSON",
//         400,
//         "INVALID_JSON",
//       );
//     }

//     // Validate request body
//     const validation = createSeatBookingHistorySchema.safeParse(body);

//     if (!validation.success) {
//       return failure(
//         validation.error.issues[0]?.message ?? "Invalid request data",
//         400,
//         "VALIDATION_ERROR",
//       );
//     }

//     const { bookings } = validation.data;

//     // Insert seat booking history
//     await db.insert(seatBookingHistory).values(
//       bookings.map((booking) => ({
//         attractionId: booking.attractionId,
//         tripNo: booking.tripNo,
//         attractionSeatId: booking.attractionSeatId,

//         // Convert number to string because seat_booking_history.seat_no
//         // is currently a varchar column.
//         seatNo: String(booking.seatNo),
//       })),
//     );

//     // Success response
//     return success(
//       {
//         message: "Seat bookings created successfully",
//       },
//       201,
//     );
//   } catch (error) {
//     console.error(
//       "POST /api/admin/ticketing-booking/seat-booking-history error:",
//       error,
//     );

//     // Handle known application errors
//     if (
//       error &&
//       typeof error === "object" &&
//       "status" in error &&
//       "code" in error
//     ) {
//       const err = error as {
//         status: number;
//         code: string;
//         message?: string;
//       };

//       return failure(err.message ?? "Request failed", err.status, err.code);
//     }

//     // Handle unexpected errors
//     return failure(
//       "Unable to create seat booking history",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { seatBookingHistory } from "@/db/schema";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

const createSeatBookingHistorySchema = z.object({
  bookings: z
    .array(
      z.object({
        attractionId: z.string().uuid("Invalid attraction ID"),

        tripNo: z
          .number()
          .int("Trip number must be an integer")
          .nonnegative("Trip number cannot be negative"),

        attractionSeatId: z.string().uuid("Invalid attraction seat ID"),

        seatNo: z
          .array(
            z
              .number()
              .int("Seat number must be an integer")
              .positive("Seat number must be greater than 0"),
          )
          .min(1, "At least one seat number is required"),
      }),
    )
    .min(1, "At least one booking is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const auth = await requireAuth(request);

    // Authorization
    await requireModuleAccess(auth, "TICKET_BOOKING");

    // Parse request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return failure(
        "Request body must contain valid JSON",
        400,
        "INVALID_JSON",
      );
    }

    // Validate request body
    const validation = createSeatBookingHistorySchema.safeParse(body);

    if (!validation.success) {
      return failure(
        validation.error.issues[0]?.message ?? "Invalid request data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { bookings } = validation.data;

    // Convert each booking with multiple seat numbers
    // into individual seat booking history rows.
    // Prepare individual booking rows for each seat
    const bookingRows = bookings.flatMap((booking) =>
      booking.seatNo.map((seatNo) => ({
        attractionId: booking.attractionId,
        tripNo: booking.tripNo,
        attractionSeatId: booking.attractionSeatId,
        seatNo,
      })),
    );

    // Insert seat booking history
    await db.insert(seatBookingHistory).values(bookingRows);

    // Success response
    return success(
      {
        message: "Seat bookings created successfully",
      },
      201,
    );
  } catch (error) {
    console.error(
      "POST /api/admin/ticketing-booking/seat-booking-history error:",
      error,
    );

    // Handle known application errors
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      "code" in error
    ) {
      const err = error as {
        status: number;
        code: string;
        message?: string;
      };

      return failure(err.message ?? "Request failed", err.status, err.code);
    }

    // Handle unexpected errors
    return failure(
      "Unable to create seat booking history",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
