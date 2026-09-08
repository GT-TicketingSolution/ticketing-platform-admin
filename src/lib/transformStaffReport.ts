/**
 * Transforms the Staff Reports API response (snake_case) into the
 * shape expected by the UI components (OverallReportSummary / AttractionReportData).
 */

import {
  StaffReportAPIResponse,
  StaffReportAttraction,
  StaffReportAttractionBooking,
  StaffReportAttractionTransactions,
  StaffReportTransaction,
} from "@/types/staffReport";
import { AttractionReportData, OverallReportSummary, TicketCategoryStat, PaymentModeStat } from "@/lib/reportsData";
import { Transaction } from "@/types/transaction";
import { Attraction } from "@/types/admin";

/**
 * Converts a flat API transaction row into the Transaction type expected by the UI.
 * The `id` includes the index in the source list so duplicate invoice_ids (same
 * invoice can be paid via multiple modes) still produce unique React keys.
 */
function transformTransaction(
  txn: StaffReportTransaction,
  attractionName: string,
  index: number
): Transaction {
  const baseId = txn.invoice_id || "txn";
  const dateStr = txn.date ? txn.date.trim() : "";
  const timeStr = txn.time ? txn.time.trim() : "";
  const dateTimeStr =
    dateStr && timeStr ? `${dateStr} ${timeStr}` : dateStr || timeStr || "-";

  return {
    id: `${baseId}-${txn.payment_mode || "pm"}-${index}`,
    transactionId: `${baseId}-${txn.payment_mode || "pm"}-${index}`,
    invoiceId: txn.invoice_id || "-",
    customerName:
      txn.customer_name && txn.customer_name.trim() !== ""
        ? txn.customer_name
        : "-",
    transactionDate: dateTimeStr,
    dateTime: dateTimeStr,
    amount: parseFloat(txn.amount) || 0,
    paymentMode: txn.payment_mode || "-",
    status: txn.status || "-",
    bookingId: "",
    attraction: attractionName,
  };
}

/**
 * Transforms a single attraction's booking data into AttractionReportData.
 */
function transformAttractionReport(
  attraction: StaffReportAttraction,
  booking: StaffReportAttractionBooking | undefined,
  transactions: StaffReportTransaction[],
  invoiceRange?: { from: string | null; to: string | null } | null
): AttractionReportData {
  const attractionObj: Attraction = {
    id: attraction.id,
    attractionId: attraction.attraction_management_id || "",
    name: attraction.name,
    category: attraction.type,
    status: "Active",
    pricing: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    image: "",
    timing: "",
    description: "",
    hasSeating: false,
    seatLayoutId: null,
    seatLayouts: [],
    seating: { adult: 1, child: 1, student: 1, senior: 1, foreigner: 1 },
  };

  const categoryBreakdown: TicketCategoryStat[] = (booking?.category_of_attraction_against_booking || []).map(
    (cat) => ({
      category: (cat.name || "Unknown") as TicketCategoryStat["category"],
      count: cat.no_of_tickets || 0,
      revenue: (cat.no_of_tickets || 0) * (parseFloat(cat.base_price) || 0),
      unitPrice: parseFloat(cat.base_price) || 0,
    })
  );

  const paymentBreakdown: PaymentModeStat[] = (booking?.payment_distribution || []).map((pm) => ({
    mode: pm.payment_mode || "UNKNOWN",
    count: pm.count || 0,
    revenue: parseFloat(pm.total_amount) || 0,
  }));

  const transactionList: Transaction[] = transactions.map((t, idx) =>
    transformTransaction(t, attraction.name, idx)
  );

  const totalRevenue = parseFloat(booking?.attraction_grand_total || "0") || 0;
  const totalTicketsSold = categoryBreakdown.reduce((sum, c) => sum + c.count, 0);
  const totalBookings = (booking?.payment_distribution || []).reduce(
    (sum, pm) => sum + pm.count,
    0
  );
  const avgOrderValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  return {
    attraction: attractionObj,
    totalRevenue,
    totalTicketsSold,
    totalBookings,
    avgOrderValue,
    categoryBreakdown,
    paymentBreakdown,
    transactions: transactionList,
    bookings: [],
    invoiceRange: invoiceRange || null,
  };
}

/**
 * Transforms the full API response into OverallReportSummary.
 */
export function transformStaffReportResponse(
  data: StaffReportAPIResponse,
  selectedAttractionName?: string
): OverallReportSummary {
  const { attractions, bookings, transactions } = data;

  // Build a map of attraction_management_id → attraction data
  const attractionMap = new Map<string, StaffReportAttraction>();
  for (const a of attractions) {
    if (a.attraction_management_id) {
      attractionMap.set(a.attraction_management_id, a);
    }
  }

  // Build a map of attraction_management_id → booking data
  const bookingMap = new Map<string, StaffReportAttractionBooking>();
  for (const b of bookings.attraction_against_booking || []) {
    bookingMap.set(b.attraction_management_id, b);
  }

  // Filter out INACTIVE attractions so their data and cards do not appear in the reports module
  const activeAttractions = (attractions || []).filter(
    (a) => !a.status || a.status.toUpperCase() !== "INACTIVE"
  );
  const activeMgmtIds = new Set(
    activeAttractions
      .map((a) => a.attraction_management_id)
      .filter((id): id is string => Boolean(id))
  );

  // Build a map of attraction_management_id → transactions & invoice_range
  const transactionMap = new Map<string, StaffReportTransaction[]>();
  const invoiceRangeMap = new Map<string, { from: string | null; to: string | null }>();
  let globalFrom: string | null = null;
  let globalTo: string | null = null;

  for (const t of transactions || []) {
    transactionMap.set(t.attraction_management_id, t.transactions || []);
    // Only accumulate overall invoice range for ACTIVE attractions
    if (!t.attraction_management_id || activeMgmtIds.has(t.attraction_management_id)) {
      if (t.invoice_range && t.invoice_range.length > 0) {
        const r = t.invoice_range[0];
        if (r && (r.from || r.to)) {
          invoiceRangeMap.set(t.attraction_management_id, { from: r.from || null, to: r.to || null });
          if (r.from) {
            if (!globalFrom || r.from < globalFrom) {
              globalFrom = r.from;
            }
          }
          if (r.to) {
            if (!globalTo || r.to > globalTo) {
              globalTo = r.to;
            }
          }
        }
      }
    }
  }

  // Build attraction reports for ACTIVE attractions only
  const attractionReports: AttractionReportData[] = activeAttractions.map((attraction) => {
    const mgmtId = attraction.attraction_management_id || "";
    const booking = mgmtId ? bookingMap.get(mgmtId) : undefined;
    const txns = mgmtId ? (transactionMap.get(mgmtId) || []) : [];
    const invRange = mgmtId ? (invoiceRangeMap.get(mgmtId) || null) : null;
    return transformAttractionReport(attraction, booking, txns, invRange);
  });

  // Filter by selected attraction if specified
  let filteredReports = attractionReports;
  if (
    selectedAttractionName &&
    selectedAttractionName !== "All" &&
    selectedAttractionName !== "All Attractions"
  ) {
    filteredReports = attractionReports.filter(
      (r) => r.attraction.name.toLowerCase() === selectedAttractionName.toLowerCase()
    );
  }

  // Calculate totals — if inactive attractions exist or a specific attraction is filtered, sum from active/filtered reports
  const hasInactive = (attractions || []).some(
    (a) => a.status && a.status.toUpperCase() === "INACTIVE"
  );
  const isFiltered = Boolean(
    selectedAttractionName &&
      selectedAttractionName !== "All" &&
      selectedAttractionName !== "All Attractions"
  );

  const totalRevenue =
    hasInactive || isFiltered
      ? filteredReports.reduce((sum, r) => sum + r.totalRevenue, 0)
      : parseFloat(bookings.grand_total_amount || "0") || 0;

  const totalBookings =
    hasInactive || isFiltered
      ? filteredReports.reduce((sum, r) => sum + r.totalBookings, 0)
      : bookings.grand_total_booking || 0;

  const totalTicketsSold = filteredReports.reduce((sum, r) => sum + r.totalTicketsSold, 0);
  const avgOrderValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // Top attraction by revenue — only show if there is actual revenue
  let topAttractionName = "";
  let topAttractionRevenue = 0;
  if (filteredReports.length > 0) {
    const sorted = [...filteredReports].sort((a, b) => b.totalRevenue - a.totalRevenue);
    if (sorted[0].totalRevenue > 0) {
      topAttractionName = sorted[0].attraction.name;
      topAttractionRevenue = sorted[0].totalRevenue;
    }
  }

  const overallInvoiceRange = globalFrom || globalTo ? { from: globalFrom, to: globalTo } : null;

  return {
    totalRevenue,
    totalTicketsSold,
    totalBookings,
    topAttractionName,
    topAttractionRevenue,
    avgOrderValue,
    attractionReports: filteredReports,
    overallInvoiceRange,
  };
}

/**
 * Returns an empty OverallReportSummary for when there's no data.
 */
export function getEmptyOverallSummary(): OverallReportSummary {
  return {
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalBookings: 0,
    topAttractionName: "",
    topAttractionRevenue: 0,
    avgOrderValue: 0,
    attractionReports: [],
  };
}
