import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  scannerInvoices,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
  attractionManagement,
  attractions,
  attractionCategory,
  seatBookingHistory,
  attractionSeats,
  users,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";
import { success, failure } from "@/lib/api/response";
import { generateBookingQRCode } from "@/lib/qr";

/* =========================================================
   GET /api/admin/ticketing-booking/print
   Query params:
     - invoiceNumber: string (e.g. "2026-2027/00760")
     OR
     - bookingId: string (UUID)
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const adminId = getAdminId(auth);

    if (!adminId) {
      return failure("Admin context required", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    const { searchParams } = new URL(request.url);
    const invoiceNumber = searchParams.get("invoiceNumber")?.trim();
    const bookingId = searchParams.get("bookingId")?.trim();

    if (!invoiceNumber && !bookingId) {
      return failure(
        "Either invoiceNumber or bookingId is required",
        400,
        "PARAMS_REQUIRED",
      );
    }

    // 1. Fetch Booking
    const bookingCondition = invoiceNumber
      ? eq(bookings.invoiceNumber, invoiceNumber)
      : eq(bookings.id, bookingId!);

    const [booking] = await db
      .select({
        id: bookings.id,
        invoiceNumber: bookings.invoiceNumber,
        customerName: bookings.customerName,
        mobileNumber: bookings.mobileNumber,
        gstNumber: bookings.gstNumber,
        totalAmount: bookings.totalAmount,
        amountReceived: bookings.amountReceived,
        returnAmount: bookings.returnAmount,
        status: bookings.status,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(and(bookingCondition, eq(bookings.isDeleted, false)))
      .limit(1);

    if (!booking) {
      return failure("Booking not found", 404, "BOOKING_NOT_FOUND");
    }

    // 2. Fetch Scanner Invoice and Parent Admin (for Business Profile)
    const [[scannerInvoice], [adminUser]] = await Promise.all([
      db
        .select({
          id: scannerInvoices.id,
          invoiceNumber: scannerInvoices.invoiceNumber,
          scannerInvoiceStatus: scannerInvoices.scannerInvoiceStatus,
        })
        .from(scannerInvoices)
        .where(
          and(
            eq(scannerInvoices.invoiceNumber, booking.invoiceNumber),
            eq(scannerInvoices.isDeleted, false),
          ),
        )
        .limit(1),

      db
        .select({
          businessName: users.businessName,
          gst: users.gst,
          cin: users.cin,
        })
        .from(users)
        .where(eq(users.id, adminId))
        .limit(1),
    ]);

    // 3. Fetch Booked Attractions
    const bookedAttractions = await db
      .select({
        attractionAgainstBookingId: attractionsAgainstBooking.id,
        attractionManagementId: attractionsAgainstBooking.attractionManagementId,
        attractionSubtotal: attractionsAgainstBooking.attractionSubtotal,
        attractionGst: attractionsAgainstBooking.attractionGst,
        attractionRoundoff: attractionsAgainstBooking.attractionRoundoff,
        attractionRoundOffGstAdj:
          attractionsAgainstBooking.attractionRoundOffGstAdj,
        attractionTotalAmount: attractionsAgainstBooking.attractionTotalAmount,
        attractionId: attractions.id,
        attractionName: attractions.name,
      })
      .from(attractionsAgainstBooking)
      .innerJoin(
        attractionManagement,
        eq(
          attractionsAgainstBooking.attractionManagementId,
          attractionManagement.id,
        ),
      )
      .innerJoin(
        attractions,
        eq(attractionManagement.attractionId, attractions.id),
      )
      .where(
        and(
          eq(attractionsAgainstBooking.bookingId, booking.id),
          eq(attractions.adminId, adminId),
        ),
      );

    if (bookedAttractions.length === 0) {
      return failure(
        "Attraction details not found or access denied",
        404,
        "ATTRACTIONS_NOT_FOUND",
      );
    }

    const attractionAgainstBookingIds = bookedAttractions.map(
      (a) => a.attractionAgainstBookingId,
    );

    // 4. Fetch Categories for these Booked Attractions
    const categoryRows = await db
      .select({
        attractionAgainstBookingId:
          categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
        categoryId: categoryOfAttractionAgainstBooking.categoryId,
        noOfVisitors: categoryOfAttractionAgainstBooking.noOfVisitors,
        name: attractionCategory.name,
        basePrice: attractionCategory.basePrice,
      })
      .from(categoryOfAttractionAgainstBooking)
      .innerJoin(
        attractionCategory,
        eq(
          categoryOfAttractionAgainstBooking.categoryId,
          attractionCategory.id,
        ),
      )
      .where(
        inArray(
          categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
          attractionAgainstBookingIds,
        ),
      );

    // 5. Structure bookingSummary & Totals
    let totalSubtotal = 0;
    let totalGst = 0;
    let totalRoundOff = 0;
    let totalRoundOffGstAdj = 0;

    const bookingSummary = bookedAttractions.map((att) => {
      const subtotal = Number(att.attractionSubtotal) || 0;
      const gst = Number(att.attractionGst) || 0;
      const roundoff = Number(att.attractionRoundoff) || 0;
      const roundOffGstAdj = Number(att.attractionRoundOffGstAdj) || 0;

      totalSubtotal += subtotal;
      totalGst += gst;
      totalRoundOff += roundoff;
      totalRoundOffGstAdj += roundOffGstAdj;

      const attCategories = categoryRows.filter(
        (c) => c.attractionAgainstBookingId === att.attractionAgainstBookingId,
      );

      return {
        attractionId: att.attractionId,
        attractionName: att.attractionName,
        subtotal,
        gst,
        roundoff,
        attractionRoundOffGstAdj: roundOffGstAdj,
        passengers: attCategories.map((c) => ({
          categoryId: c.categoryId,
          label: c.name,
          qty: c.noOfVisitors,
          unitPrice: Number(c.basePrice) || 0,
          price: Number(c.basePrice) || 0,
        })),
      };
    });

    // 6. Generate QR codes for each attraction
    const scannerInvoiceId = scannerInvoice?.id || booking.id;
    const dateFormatted = booking.createdAt.toISOString().split("T")[0];

    const qrCodes = await Promise.all(
      bookedAttractions.map((att) => {
        const attCategories = categoryRows.filter(
          (c) => c.attractionAgainstBookingId === att.attractionAgainstBookingId,
        );

        return generateBookingQRCode({
          bookingId: booking.id,
          invoiceNumber: booking.invoiceNumber,
          scannerInvoiceId,
          attractionId: att.attractionId,
          attractionName: att.attractionName,
          categories: attCategories.map((c) => ({
            categoryId: c.categoryId,
            noOfVisitors: c.noOfVisitors,
          })),
          date: dateFormatted,
        });
      }),
    );

    // 7. Check for Seat Details (if seating attraction)
    const attractionIds = bookedAttractions.map((a) => a.attractionId);
    const bookingDate = new Date(booking.createdAt);
    const startOfBookingDay = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate(),
      0,
      0,
      0,
    );
    const endOfBookingDay = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate(),
      23,
      59,
      59,
    );

    const seatRows = await db
      .select({
        attractionId: seatBookingHistory.attractionId,
        tripNo: seatBookingHistory.tripNo,
        seatNo: seatBookingHistory.seatNo,
        sectionName: attractionSeats.name,
      })
      .from(seatBookingHistory)
      .leftJoin(
        attractionSeats,
        eq(seatBookingHistory.attractionSeatId, attractionSeats.id),
      )
      .where(
        and(
          inArray(seatBookingHistory.attractionId, attractionIds),
          eq(seatBookingHistory.createdAt, booking.createdAt),
        ),
      );

    const seatDetails = bookedAttractions
      .map((att) => {
        const attSeats = seatRows.filter(
          (s) => s.attractionId === att.attractionId,
        );
        if (attSeats.length === 0) return null;

        const sectionMap = new Map<string, number[]>();
        attSeats.forEach((s) => {
          const sec = s.sectionName || "Coach";
          if (!sectionMap.has(sec)) sectionMap.set(sec, []);
          sectionMap.get(sec)!.push(s.seatNo);
        });

        return {
          attractionId: att.attractionId,
          attractionName: att.attractionName,
          tripNo: attSeats[0]?.tripNo || 1,
          sections: Array.from(sectionMap.entries()).map(([name, seats]) => ({
            name,
            seats: seats.sort((a, b) => a - b),
          })),
        };
      })
      .filter(Boolean);

    return success({
      booking: {
        id: booking.id,
        invoiceNumber: booking.invoiceNumber,
        customerName: booking.customerName || "Guest",
        mobileNumber: booking.mobileNumber || "-",
        totalAmount: Number(booking.totalAmount),
        amountReceived: Number(booking.amountReceived),
        returnAmount: Number(booking.returnAmount),
        subtotal: Number(totalSubtotal.toFixed(2)),
        gstAmount: Number(totalGst.toFixed(2)),
        roundOff: Number(totalRoundOff.toFixed(2)),
        attractionRoundOffGstAdj: Number(totalRoundOffGstAdj.toFixed(2)),
        createdAt: booking.createdAt,
      },
      business: {
        businessName: adminUser?.businessName || "",
        gst: adminUser?.gst || "",
        cin: adminUser?.cin || "",
      },
      bookingSummary,
      qrCodes,
      seatDetails,
    });
  } catch (error) {
    console.error("GET /api/admin/ticketing-booking/print error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required", 401, "UNAUTHORIZED");
    }

    return failure(
      "Unable to fetch ticket print data",
      500,
      "TICKET_FETCH_FAILED",
    );
  }
}
