import { AttractionReportData, OverallReportSummary, TicketCategoryStat, PaymentModeStat } from "./reportsData";
import { Attraction } from "@/types/admin";
import { Transaction } from "@/types/transaction";

export interface MockAttractionSeed {
  id: string;
  name: string;
  category: "RIDE" | "WATER" | "SHOW" | "ADVENTURE";
  image: string;
  status: "Active";
  timing: string;
  description: string;
  rates: {
    adult: number;
    child: number;
    student: number;
    senior: number;
    foreigner: number;
  };
}

export const MOCK_STAFF_ATTRACTIONS: MockAttractionSeed[] = [
  {
    id: "attr-mock-01",
    name: "Roller Coaster Thunder",
    category: "RIDE",
    image: "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=300&auto=format&fit=crop&q=80",
    status: "Active",
    timing: "10:00 AM - 08:30 PM",
    description: "High-speed multi-inversion roller coaster with dramatic loops and sudden drops.",
    rates: { adult: 350, child: 220, student: 280, senior: 200, foreigner: 600 },
  },
  {
    id: "attr-mock-02",
    name: "Aqua Splash Water World",
    category: "WATER",
    image: "https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?w=300&auto=format&fit=crop&q=80",
    status: "Active",
    timing: "09:30 AM - 06:30 PM",
    description: "Mega wave pool, dynamic water slides, lazy river, and family splash zone.",
    rates: { adult: 480, child: 320, student: 390, senior: 280, foreigner: 750 },
  },
  {
    id: "attr-mock-03",
    name: "Sky High Ferris Wheel",
    category: "RIDE",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=80",
    status: "Active",
    timing: "11:00 AM - 09:30 PM",
    description: "60-meter panoramic giant wheel offering breathtaking 360-degree aerial horizon views.",
    rates: { adult: 200, child: 120, student: 160, senior: 120, foreigner: 350 },
  },
  {
    id: "attr-mock-04",
    name: "Haunted Manor 4D",
    category: "SHOW",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80",
    status: "Active",
    timing: "10:30 AM - 07:30 PM",
    description: "Immersive multi-sensory 4D haunted experience with motion seats and wind/scent effects.",
    rates: { adult: 280, child: 180, student: 220, senior: 160, foreigner: 500 },
  },
  {
    id: "attr-mock-05",
    name: "Jungle Safari Express",
    category: "ADVENTURE",
    image: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=300&auto=format&fit=crop&q=80",
    status: "Active",
    timing: "09:00 AM - 05:45 PM",
    description: "Expedition train tour exploring exotic wildlife habitats, waterfalls, and scenic bridges.",
    rates: { adult: 320, child: 190, student: 250, senior: 180, foreigner: 550 },
  },
];

const CUSTOMER_NAMES = [
  "Rahul Sharma", "Ananya Deshmukh", "Vikram Patel", "Sneha Rao", "Aditya Joshi",
  "Pooja Mehta", "Karthik Nair", "Divya Menon", "Rohan Gupta", "Meera Sundaram",
  "Siddharth Varma", "Deepika Iyer", "Arjun Reddy", "Kavya Nambiar", "Abhishek Tiwari",
  "Shreya Kulkarni", "Manoj Pillai", "Tanvi Agarwal", "Gaurav Malhotra", "Neha Sen"
];

const PAYMENT_MODES = ["UPI", "Cash"];

function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getMockStaffReports(
  durationHours: number = 24,
  fromDate?: string,
  toDate?: string,
  selectedAttractionName?: string,
  fromTime?: string,
  toTime?: string
): OverallReportSummary {
  const now = new Date();
  const effectiveHours = Math.max(1, durationHours || 24);
  const minAllowedTimestamp = now.getTime() - effectiveHours * 60 * 60 * 1000;

  let filterStartMs = minAllowedTimestamp;
  if (fromDate) {
    const timeStr = fromTime ? `${fromTime}:00` : "00:00:00";
    const parsedFrom = new Date(`${fromDate}T${timeStr}`).getTime();
    if (!isNaN(parsedFrom)) {
      filterStartMs = Math.max(minAllowedTimestamp, parsedFrom);
    }
  }

  let filterEndMs = now.getTime();
  if (toDate) {
    const timeStr = toTime ? `${toTime}:59.999` : "23:59:59.999";
    const parsedTo = new Date(`${toDate}T${timeStr}`).getTime();
    if (!isNaN(parsedTo)) {
      filterEndMs = parsedTo;
    }
  }

  if (filterStartMs > filterEndMs) {
    filterStartMs = filterEndMs - 60 * 60 * 1000;
  }

  const attractionReports: AttractionReportData[] = [];
  const rand = pseudoRandom(42 + Math.floor(filterStartMs / 86400000));

  MOCK_STAFF_ATTRACTIONS.forEach((seed, idx) => {
    const hoursSpan = Math.max(1, (filterEndMs - filterStartMs) / (60 * 60 * 1000));
    const txCount = Math.max(2, Math.round((hoursSpan / 24) * (5 + (idx % 3) * 2)));

    const transactions: Transaction[] = [];
    let totalTickets = 0;
    let totalRevenue = 0;

    const catCounts = {
      Adult: 0,
      Child: 0,
      Student: 0,
      Senior: 0,
      Foreigner: 0,
    };
    const catRevenue = {
      Adult: 0,
      Child: 0,
      Student: 0,
      Senior: 0,
      Foreigner: 0,
    };

    const payCounts: Record<string, { count: number; amount: number }> = {
      "UPI": { count: 0, amount: 0 },
      "Cash": { count: 0, amount: 0 }
    };

    for (let i = 0; i < txCount; i++) {
      const timeOffset = (filterEndMs - filterStartMs) * (0.05 + 0.9 * (i / Math.max(1, txCount - 1)));
      const txTimestamp = new Date(filterStartMs + timeOffset);

      const qAdult = 1 + Math.floor(rand() * 3);
      const qChild = rand() > 0.45 ? Math.floor(rand() * 2) : 0;
      const qStudent = rand() > 0.7 ? 1 : 0;
      const qSenior = rand() > 0.8 ? 1 : 0;
      const qForeigner = rand() > 0.9 ? 1 : 0;

      const bookingTickets = qAdult + qChild + qStudent + qSenior + qForeigner;
      const bookingAmount =
        qAdult * seed.rates.adult +
        qChild * seed.rates.child +
        qStudent * seed.rates.student +
        qSenior * seed.rates.senior +
        qForeigner * seed.rates.foreigner;

      totalTickets += bookingTickets;
      totalRevenue += bookingAmount;

      catCounts.Adult += qAdult;
      catCounts.Child += qChild;
      catCounts.Student += qStudent;
      catCounts.Senior += qSenior;
      catCounts.Foreigner += qForeigner;

      catRevenue.Adult += qAdult * seed.rates.adult;
      catRevenue.Child += qChild * seed.rates.child;
      catRevenue.Student += qStudent * seed.rates.student;
      catRevenue.Senior += qSenior * seed.rates.senior;
      catRevenue.Foreigner += qForeigner * seed.rates.foreigner;

      const pIdx = Math.floor(rand() * PAYMENT_MODES.length);
      const mode = PAYMENT_MODES[pIdx];
      payCounts[mode].count += 1;
      payCounts[mode].amount += bookingAmount;

      const customerName = CUSTOMER_NAMES[(idx * 4 + i) % CUSTOMER_NAMES.length];
      const txnNumber = 1000 + idx * 200 + i * 17;

      const formattedDate = txTimestamp.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const formattedTime = txTimestamp.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      transactions.push({
        id: `TXN-${txnNumber}`,
        transactionId: `TXN-${txnNumber}`,
        customerName,
        dateTime: `${formattedDate}, ${formattedTime}`,
        transactionDate: `${formattedDate}, ${formattedTime}`,
        amount: bookingAmount,
        paymentMode: mode,
        status: "Completed",
        attractionId: seed.id,
        attractionName: seed.name,
      } as any);
    }

    transactions.reverse();

    const categoryBreakdown: TicketCategoryStat[] = [
      {
        category: "Adult" as const,
        count: catCounts.Adult,
        revenue: catRevenue.Adult,
        unitPrice: seed.rates.adult,
      },
      {
        category: "Child" as const,
        count: catCounts.Child,
        revenue: catRevenue.Child,
        unitPrice: seed.rates.child,
      },
      {
        category: "Student" as const,
        count: catCounts.Student,
        revenue: catRevenue.Student,
        unitPrice: seed.rates.student,
      },
      {
        category: "Senior" as const,
        count: catCounts.Senior,
        revenue: catRevenue.Senior,
        unitPrice: seed.rates.senior,
      },
      {
        category: "Foreigner" as const,
        count: catCounts.Foreigner,
        revenue: catRevenue.Foreigner,
        unitPrice: seed.rates.foreigner,
      },
    ].filter((c) => c.count > 0 || c.unitPrice > 0);

    const paymentBreakdown: PaymentModeStat[] = Object.entries(payCounts).map(
      ([mode, data]) => ({
        mode,
        count: data.count,
        revenue: data.amount,
      })
    );

    const attraction: Attraction = {
      id: seed.id,
      attractionId: seed.id,
      name: seed.name,
      category: seed.category as any,
      status: seed.status as any,
      pricing: seed.rates,
      image: seed.image,
      timing: seed.timing,
      description: seed.description,
      hasSeating: false,
      seatLayoutId: null,
      seatLayouts: [],
      seating: { adult: 1, child: 1, student: 1, senior: 1, foreigner: 1 },
    } as unknown as Attraction;

    attractionReports.push({
      attraction,
      totalRevenue,
      totalTicketsSold: totalTickets,
      totalBookings: txCount,
      avgOrderValue: txCount > 0 ? Math.round(totalRevenue / txCount) : 0,
      categoryBreakdown,
      paymentBreakdown,
      transactions,
      bookings: [],
    });
  });

  let filteredAttractionReports = attractionReports;
  if (selectedAttractionName && selectedAttractionName !== "All" && selectedAttractionName !== "All Attractions") {
    filteredAttractionReports = attractionReports.filter(
      (r) => r.attraction.name.toLowerCase() === selectedAttractionName.toLowerCase()
    );
  }

  const totalRevenue = filteredAttractionReports.reduce((sum, a) => sum + a.totalRevenue, 0);
  const totalTicketsSold = filteredAttractionReports.reduce((sum, a) => sum + a.totalTicketsSold, 0);
  const totalBookings = filteredAttractionReports.reduce((sum, a) => sum + a.totalBookings, 0);
  const avgOrderValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  let topAttractionName = "None";
  let topAttractionRevenue = 0;
  if (filteredAttractionReports.length > 0) {
    const sorted = [...filteredAttractionReports].sort((a, b) => b.totalRevenue - a.totalRevenue);
    topAttractionName = sorted[0].attraction.name;
    topAttractionRevenue = sorted[0].totalRevenue;
  }

  return {
    totalRevenue,
    totalTicketsSold,
    totalBookings,
    topAttractionName,
    topAttractionRevenue,
    avgOrderValue,
    attractionReports: filteredAttractionReports,
  };
}
