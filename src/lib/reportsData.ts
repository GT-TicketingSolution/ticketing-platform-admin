import { Attraction, INITIAL_ATTRACTIONS } from "@/types/admin";
import { Booking } from "@/types/booking";
import { Transaction } from "@/types/transaction";
import { INITIAL_TRANSACTIONS } from "@/lib/mockTransactions";
import { INITIAL_BOOKINGS } from "@/lib/mockBookings";

export interface TicketCategoryStat {
  category: "Adult" | "Child" | "Student" | "Senior" | "Foreigner";
  count: number;
  revenue: number;
  unitPrice: number;
}

export interface PaymentModeStat {
  mode: string;
  count: number;
  revenue: number;
}

export interface AttractionReportData {
  attraction: Attraction;
  totalRevenue: number;
  totalTicketsSold: number;
  totalBookings: number;
  avgOrderValue: number;
  categoryBreakdown: TicketCategoryStat[];
  paymentBreakdown: PaymentModeStat[];
  transactions: Transaction[];
  bookings: Booking[];
}

export interface OverallReportSummary {
  totalRevenue: number;
  totalTicketsSold: number;
  totalBookings: number;
  topAttractionName: string;
  topAttractionRevenue: number;
  avgOrderValue: number;
  attractionReports: AttractionReportData[];
}

/**
 * Normalizes date string to YYYY-MM-DD format
 */
function normalizeDateStr(dateStr: string): string {
  if (!dateStr) return "";
  // If format is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // If format is like "01 Aug 2026" or ISO
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {}
  return dateStr;
}

/**
 * Filter bookings and transactions by date range [fromDate, toDate]
 */
export function getFilteredDataByDate(fromDate?: string, toDate?: string) {
  const normFrom = normalizeDateStr(fromDate || "");
  const normTo = normalizeDateStr(toDate || "");

  const filteredTransactions = INITIAL_TRANSACTIONS.filter((t) => {
    const tDate = t.date || normalizeDateStr(t.dateTime);
    if (normFrom && tDate < normFrom) return false;
    if (normTo && tDate > normTo) return false;
    return true;
  });

  const filteredBookings = INITIAL_BOOKINGS.filter((b) => {
    const bDate = b.visitDate || normalizeDateStr(b.createdAt);
    if (normFrom && bDate < normFrom) return false;
    if (normTo && bDate > normTo) return false;
    return true;
  });

  return { filteredTransactions, filteredBookings };
}

/**
 * Generates detailed sales report data for a specific attraction or all attractions
 */
export function generateAttractionReportData(
  attraction: Attraction,
  transactions: Transaction[],
  bookings: Booking[]
): AttractionReportData {
  // Matches attraction name loosely (e.g. "Toy Train", "Toy Train Ride", etc.)
  const attrName = attraction.name.toLowerCase();

  const attrTransactions = transactions.filter(
    (t) => t.attraction && t.attraction.toLowerCase().includes(attrName)
  );

  const attrBookings = bookings.filter(
    (b) => b.attraction && b.attraction.toLowerCase().includes(attrName)
  );

  // Total revenue & confirmed bookings calculation
  const totalRevenue = attrTransactions.reduce(
    (sum, t) => (t.status === "Cancelled" ? sum : sum + t.amount),
    0
  );

  const totalBookings = attrBookings.length;

  // Compute category breakdown from bookings ticket summaries & attraction pricing
  const pricing = attraction.pricing || { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 };
  
  const categoryCounts: Record<"Adult" | "Child" | "Student" | "Senior" | "Foreigner", number> = {
    Adult: 0,
    Child: 0,
    Student: 0,
    Senior: 0,
    Foreigner: 0,
  };

  let calculatedTicketsSold = 0;

  attrBookings.forEach((b) => {
    if (b.ticketSummary && b.ticketSummary.length > 0) {
      b.ticketSummary.forEach((ts) => {
        const catName = ts.category;
        if (categoryCounts[catName] !== undefined) {
          categoryCounts[catName] += ts.quantity;
          calculatedTicketsSold += ts.quantity;
        }
      });
    } else {
      // Fallback: estimate from totalVisitors
      const visitorCount = b.totalVisitors || 1;
      categoryCounts.Adult += visitorCount;
      calculatedTicketsSold += visitorCount;
    }
  });

  // If no bookings match exactly, estimate tickets from transactions amount
  if (calculatedTicketsSold === 0 && totalRevenue > 0) {
    const avgPrice = pricing.adult || 100;
    const estTickets = Math.max(1, Math.round(totalRevenue / avgPrice));
    categoryCounts.Adult = Math.round(estTickets * 0.6);
    categoryCounts.Child = Math.round(estTickets * 0.25);
    categoryCounts.Senior = Math.round(estTickets * 0.15);
    calculatedTicketsSold = estTickets;
  }

  const categoryBreakdown: TicketCategoryStat[] = [
    { category: "Adult", count: categoryCounts.Adult, revenue: categoryCounts.Adult * pricing.adult, unitPrice: pricing.adult },
    { category: "Child", count: categoryCounts.Child, revenue: categoryCounts.Child * pricing.child, unitPrice: pricing.child },
    { category: "Student", count: categoryCounts.Student, revenue: categoryCounts.Student * pricing.student, unitPrice: pricing.student },
    { category: "Senior", count: categoryCounts.Senior, revenue: categoryCounts.Senior * pricing.senior, unitPrice: pricing.senior },
    { category: "Foreigner", count: categoryCounts.Foreigner, revenue: categoryCounts.Foreigner * pricing.foreigner, unitPrice: pricing.foreigner },
  ];

  // Compute payment mode breakdown
  const paymentModesMap: Record<string, { count: number; revenue: number }> = {};

  attrTransactions.forEach((t) => {
    const mode = t.paymentMode || "Cash";
    if (!paymentModesMap[mode]) {
      paymentModesMap[mode] = { count: 0, revenue: 0 };
    }
    paymentModesMap[mode].count += 1;
    if (t.status !== "Cancelled") {
      paymentModesMap[mode].revenue += t.amount;
    }
  });

  const paymentBreakdown: PaymentModeStat[] = Object.entries(paymentModesMap).map(
    ([mode, stats]) => ({
      mode,
      count: stats.count,
      revenue: stats.revenue,
    })
  );

  const avgOrderValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  return {
    attraction,
    totalRevenue,
    totalTicketsSold: calculatedTicketsSold,
    totalBookings,
    avgOrderValue,
    categoryBreakdown,
    paymentBreakdown,
    transactions: attrTransactions,
    bookings: attrBookings,
  };
}

/**
 * Calculates summary metrics across all attractions
 */
export function getOverallReportSummary(
  fromDate?: string,
  toDate?: string
): OverallReportSummary {
  const { filteredTransactions, filteredBookings } = getFilteredDataByDate(fromDate, toDate);

  const attractionReports = INITIAL_ATTRACTIONS.map((attraction) =>
    generateAttractionReportData(attraction, filteredTransactions, filteredBookings)
  );

  let totalRevenue = 0;
  let totalTicketsSold = 0;
  let totalBookings = 0;
  let topAttractionName = "-";
  let topAttractionRevenue = -1;

  attractionReports.forEach((rep) => {
    totalRevenue += rep.totalRevenue;
    totalTicketsSold += rep.totalTicketsSold;
    totalBookings += rep.totalBookings;

    if (rep.totalRevenue > topAttractionRevenue) {
      topAttractionRevenue = rep.totalRevenue;
      topAttractionName = rep.attraction.name;
    }
  });

  const avgOrderValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  return {
    totalRevenue,
    totalTicketsSold,
    totalBookings,
    topAttractionName,
    topAttractionRevenue: Math.max(0, topAttractionRevenue),
    avgOrderValue,
    attractionReports,
  };
}
