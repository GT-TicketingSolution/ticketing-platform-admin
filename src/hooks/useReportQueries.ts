"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import type {
  AttractionReportData,
  TicketCategoryStat,
  PaymentModeStat,
  OverallReportSummary,
} from "@/lib/reportsData";

// ── API response shapes ────────────────────────────────────────────────────────

export interface ReportSummaryResponse {
  totalBookings: number;
  totalTickets: number;
  totalRevenue: number;
  totalTransactions?: number;
  totalRefunds?: number;
  topAttraction?: {
    id: string;
    name: string;
    revenue: number;
  } | null;
}

export interface AttractionReportItem {
  attractionId: string;
  attractionName: string;
  totalBookings: number;
  totalTickets: number;
  totalRevenue: number;
  attraction?: {
    id: string;
    name: string;
    type?: string;
    status?: string;
    timing?: string;
    adultRate?: number;
    childRate?: number;
    studentRate?: number;
    seniorRate?: number;
    foreignerRate?: number;
    image?: string;
  };
  ticketCategorySales?: Array<{
    category: string;
    rate: number;
    quantity: number;
    revenue: number;
  }>;
  paymentDistribution?: Array<{
    mode: string;
    transactions: number;
    amount: number;
  }>;
  recentTransactions?: Array<{
    transactionId: string;
    customerName: string;
    dateTime: Date | string;
    paymentMode: string;
    amount: number;
    status: string;
  }>;
}

export interface TicketBreakdownItem {
  ticketType: string;
  count: number;
  revenue: number;
}

export interface PaymentDistributionItem {
  paymentMode: string;
  transactionCount: number;
  amount: number;
}

// ── Query keys ─────────────────────────────────────────────────────────────────

export const reportKeys = {
  all: ["reports"] as const,
  summary: (fromDate?: string, toDate?: string, attractionId?: string) =>
    [...reportKeys.all, "summary", { fromDate, toDate, attractionId }] as const,
  attraction: (fromDate?: string, toDate?: string) =>
    [...reportKeys.all, "attraction", { fromDate, toDate }] as const,
  payment: () => [...reportKeys.all, "payment"] as const,
  tickets: () => [...reportKeys.all, "tickets"] as const,
};

// ── Raw API Fetchers ───────────────────────────────────────────────────────────

/** GET /api/admin/reports/summary */
export function useReportSummary(
  fromDate?: string,
  toDate?: string,
  attractionId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery<ReportSummaryResponse>({
    queryKey: reportKeys.summary(fromDate, toDate, attractionId),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (fromDate) sp.set("fromDate", fromDate);
      if (toDate) sp.set("toDate", toDate);
      if (attractionId && attractionId !== "ALL") sp.set("attractionId", attractionId);

      const qs = sp.toString();
      const url = qs ? `${AppUrl.reports.summary}?${qs}` : AppUrl.reports.summary;
      const res = await getData<any>(url);
      const payload = res?.data ?? res ?? {};

      return {
        totalBookings: Number(payload.totalBookings ?? 0),
        totalTickets: Number(payload.totalTicketsSold ?? payload.totalTickets ?? 0),
        totalRevenue: Number(payload.totalRevenue ?? 0),
        totalTransactions: Number(payload.totalTransactions ?? 0),
        totalRefunds: Number(payload.totalRefunds ?? 0),
        topAttraction: payload.topAttraction ?? null,
      };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/** GET /api/admin/reports/attractions (and alias /attraction) */
export function useReportAttraction(
  fromDate?: string,
  toDate?: string,
  options?: { enabled?: boolean }
) {
  return useQuery<AttractionReportItem[]>({
    queryKey: reportKeys.attraction(fromDate, toDate),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (fromDate) sp.set("fromDate", fromDate);
      if (toDate) sp.set("toDate", toDate);

      const qs = sp.toString();
      const url = qs ? `${AppUrl.reports.attractions}?${qs}` : AppUrl.reports.attractions;
      const res = await getData<any>(url);
      const payload = res?.data ?? res ?? {};
      const items: any[] = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

      return items.map((item: any) => {
        const attr = item.attraction ?? {};
        const attractionId = attr.id || item.attractionId || item.id || "";
        const attractionName = attr.name || item.attractionName || item.name || "-";
        const totalBookings = Number(item.bookings ?? item.totalBookings ?? 0);
        const totalTickets = Number(
          item.tickets ?? item.totalTickets ?? item.totalTicketsSold ?? 0
        );
        const totalRevenue = Number(item.revenue ?? item.totalRevenue ?? 0);

        return {
          attractionId,
          attractionName,
          totalBookings,
          totalTickets,
          totalRevenue,
          attraction: item.attraction,
          ticketCategorySales: item.ticketCategorySales ?? [],
          paymentDistribution: item.paymentDistribution ?? [],
          recentTransactions: item.recentTransactions ?? [],
        };
      });
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/** GET /api/admin/reports/payment */
export function useReportPayment(options?: { enabled?: boolean }) {
  return useQuery<PaymentDistributionItem[]>({
    queryKey: reportKeys.payment(),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await getData<any>(AppUrl.reports.payment);
      const payload = res?.data ?? res ?? {};
      const items: any[] = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

      return items.map((item: any) => ({
        paymentMode: item.mode || item.paymentMode || "-",
        transactionCount: Number(item.transactions ?? item.transactionCount ?? item.count ?? 0),
        amount: Number(item.amount ?? item.revenue ?? 0),
      }));
    },
    staleTime: 60 * 1000,
  });
}

/** GET /api/admin/reports/tickets */
export function useReportTickets(options?: { enabled?: boolean }) {
  return useQuery<TicketBreakdownItem[]>({
    queryKey: reportKeys.tickets(),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await getData<any>(AppUrl.reports.tickets);
      const payload = res?.data ?? res ?? {};
      const items: any[] = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

      return items.map((item: any) => ({
        ticketType: item.category || item.ticketType || "-",
        count: Number(item.quantity ?? item.count ?? 0),
        revenue: Number(item.revenue ?? 0),
      }));
    },
    staleTime: 60 * 1000,
  });
}

// ── Composed selector: maps API data → AttractionReportData[] ─────────────────

function ticketTypeToCategory(
  type: string
): TicketCategoryStat["category"] {
  const t = type.toUpperCase();
  if (t === "ADULT" || t === "ADULTS") return "Adult";
  if (t === "CHILD" || t === "CHILDREN") return "Child";
  if (t === "STUDENT" || t === "STUDENTS") return "Student";
  if (t === "SENIOR" || t.includes("SENIOR")) return "Senior";
  if (t === "FOREIGNER" || t.includes("FOREIGN")) return "Foreigner";
  return "Adult";
}

/**
 * Composes all four API responses into the `OverallReportSummary` shape
 * that the existing page/components already expect — zero UI changes needed.
 */
export function buildOverallSummary(
  summaryData: ReportSummaryResponse | undefined,
  attractionItems: AttractionReportItem[],
  ticketItems: TicketBreakdownItem[],
  paymentItems: PaymentDistributionItem[],
  attractionsMaster: any[] = []
): OverallReportSummary {
  // ── Build category breakdown (global tickets endpoint) ────────────────────
  const globalCategoryBreakdown: TicketCategoryStat[] = ticketItems.map((item) => ({
    category: ticketTypeToCategory(item.ticketType),
    count: item.count,
    revenue: item.revenue,
    unitPrice: item.count > 0 ? Math.round(item.revenue / item.count) : 0,
  }));

  // ── Build payment breakdown (global payment endpoint) ─────────────────────
  const globalPaymentBreakdown: PaymentModeStat[] = paymentItems.map((item) => ({
    mode: item.paymentMode,
    count: item.transactionCount,
    revenue: item.amount,
  }));

  // ── Map attraction items → AttractionReportData[] ─────────────────────────
  let attractionReports: AttractionReportData[] = [];

  if (attractionItems.length > 0) {
    attractionReports = attractionItems.map((item) => {
      const master = attractionsMaster.find(
        (a) =>
          (a.attractionId && (a.attractionId === item.attractionId || a.id === item.attractionId)) ||
          (a.id && (a.id === item.attractionId || a.attractionId === item.attractionId)) ||
          (a.name && item.attractionName && a.name.toLowerCase() === item.attractionName.toLowerCase())
      );

      const attrObj = item.attraction ?? master ?? {};
      const avgOrderValue =
        item.totalBookings > 0
          ? Math.round(item.totalRevenue / item.totalBookings)
          : 0;

      // Map item-specific ticket category sales if returned by backend
      const categoryBreakdown: TicketCategoryStat[] =
        item.ticketCategorySales && item.ticketCategorySales.length > 0
          ? item.ticketCategorySales.map((c: any) => ({
            category: ticketTypeToCategory(c.category),
            count: Number(c.quantity ?? c.count ?? 0),
            revenue: Number(c.revenue ?? 0),
            unitPrice: Number(c.rate ?? (c.quantity > 0 ? Math.round(c.revenue / c.quantity) : 0)),
          }))
          : [];

      // Map item-specific payment distribution if returned by backend
      const paymentBreakdown: PaymentModeStat[] =
        item.paymentDistribution && item.paymentDistribution.length > 0
          ? item.paymentDistribution.map((p: any) => ({
            mode: p.mode || p.paymentMode || "-",
            count: Number(p.transactions ?? p.count ?? 0),
            revenue: Number(p.amount ?? p.revenue ?? 0),
          }))
          : [];

      // Map item-specific recent transactions if returned by backend
      const transactions: any[] =
        item.recentTransactions && item.recentTransactions.length > 0
          ? item.recentTransactions.map((t: any) => ({
            id: t.transactionId || t.id || "",
            transactionId: t.transactionId || t.id || "",
            customerName: t.customerName || "-",
            dateTime: t.dateTime ? new Date(t.dateTime).toLocaleString("en-IN") : "-",
            transactionDate: t.dateTime ? new Date(t.dateTime).toISOString() : "",
            paymentMode: t.paymentMode || "-",
            amount: Number(t.amount ?? 0),
            status: t.status || "SUCCESSFUL",
            attraction: { name: item.attractionName || attrObj.name || "-" },
          }))
          : [];

      return {
        attraction: {
          id: item.attractionId || attrObj.id || "",
          attractionId: item.attractionId || attrObj.attractionId || attrObj.id || "",
          name: item.attractionName || attrObj.name || "-",
          category: (attrObj.type || attrObj.category || "RIDE") as any,
          status: (attrObj.status || "Active") as any,
          pricing: {
            adult: Number(attrObj.adultRate ?? attrObj.adultPrice ?? attrObj.pricing?.adult ?? 0),
            child: Number(attrObj.childRate ?? attrObj.childPrice ?? attrObj.pricing?.child ?? 0),
            student: Number(attrObj.studentRate ?? attrObj.studentPrice ?? attrObj.pricing?.student ?? 0),
            senior: Number(attrObj.seniorRate ?? attrObj.seniorPrice ?? attrObj.pricing?.senior ?? 0),
            foreigner: Number(attrObj.foreignerRate ?? attrObj.foreignerPrice ?? attrObj.pricing?.foreigner ?? 0),
          },
          image: attrObj.image || "",
          timing: attrObj.timing || "",
          description: attrObj.description || "",
          hasSeating: attrObj.hasSeating || false,
          seatLayoutId: attrObj.seatLayoutId || null,
          seatLayouts: attrObj.seatLayouts || [],
          seating: master.seating ?? { adult: 1, child: 1, student: 1, senior: 1, foreigner: 1 },
        },
        totalRevenue: item.totalRevenue,
        totalTicketsSold: item.totalTickets,
        totalBookings: item.totalBookings,
        avgOrderValue,
        categoryBreakdown,
        paymentBreakdown,
        transactions,
        bookings: [],
      };
    });
  } else if (attractionsMaster.length > 0) {
    attractionReports = attractionsMaster.map((master) => ({
      attraction: {
        id: master.attractionId || master.id || "",
        attractionId: master.attractionId || master.id || "",
        name: master.name || "-",
        category: (master.category || master.type || "RIDE") as any,
        status: (master.status || "Active") as any,
        pricing: {
          adult: Number(master.adultRate ?? master.adultPrice ?? master.pricing?.adult ?? 0),
          child: Number(master.childRate ?? master.childPrice ?? master.pricing?.child ?? 0),
          student: Number(master.studentRate ?? master.studentPrice ?? master.pricing?.student ?? 0),
          senior: Number(master.seniorRate ?? master.seniorPrice ?? master.pricing?.senior ?? 0),
          foreigner: Number(master.foreignerRate ?? master.foreignerPrice ?? master.pricing?.foreigner ?? 0),
        },
        image: master.image || "",
        timing: master.timing || "",
        description: master.description || "",
        hasSeating: master.hasSeating || false,
        seatLayoutId: master.seatLayoutId || null,
        seatLayouts: master.seatLayouts || [],
        seating: master.seating ?? { adult: 1, child: 1, student: 1, senior: 1, foreigner: 1 },
      },
      totalRevenue: 0,
      totalTicketsSold: 0,
      totalBookings: 0,
      avgOrderValue: 0,
      categoryBreakdown: [],
      paymentBreakdown: [],
      transactions: [],
      bookings: [],
    }));
  }

  // ── Overall summary values ─────────────────────────────────────────────────
  const totalRevenue = summaryData?.totalRevenue ?? 0;
  const totalTicketsSold = summaryData?.totalTickets ?? 0;
  const totalBookings = summaryData?.totalBookings ?? 0;
  const avgOrderValue =
    totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // ── Top attraction (highest revenue in list or from summary) ───────────────
  let topAttractionName = summaryData?.topAttraction?.name ?? "-";
  let topAttractionRevenue = summaryData?.topAttraction?.revenue ?? 0;

  if (topAttractionName === "-" || topAttractionRevenue === 0) {
    attractionReports.forEach((item) => {
      if (item.totalRevenue > topAttractionRevenue) {
        topAttractionRevenue = item.totalRevenue;
        topAttractionName = item.attraction.name;
      }
    });
  }

  return {
    totalRevenue,
    totalTicketsSold,
    totalBookings,
    topAttractionName: topAttractionName === "-" ? "None" : topAttractionName,
    topAttractionRevenue,
    avgOrderValue,
    attractionReports,
  };
}
