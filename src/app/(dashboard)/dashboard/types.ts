// ─── Dashboard API Response Types ─

export interface DashboardSummary {
  totalManagers: number;
  activeManagers: number;
  totalStaff: number;
  activeStaff: number;
  totalBookings: number;
  totalEarnings: number;
}

export interface AttractionFilter {
  id: string;
  name: string;
}

export interface DashboardFilters {
  attractions: AttractionFilter[];
}

export interface PerformanceDataPoint {
  month: string;
  value: number;
}

export interface DashboardPerformance {
  revenue: PerformanceDataPoint[];
  bookings: PerformanceDataPoint[];
}

export interface AttractionDistributionItem {
  attractionId: string;
  attractionName: string;
  revenue: number;
  percentage: number;
}

export interface RecentManagerItem {
  id: string;
  name: string;
  email: string;
  mobile: string;
  attraction: {
    id: string;
    name: string;
  } | null;
  joinedDate: string;
  totalBookings: number;
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
}

export interface RecentManagers {
  items: RecentManagerItem[];
  total: number;
}

export interface AppliedFilters {
  period: string;
  attractionId: string | null;
  search: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface DashboardViewer {
  role: string;
  adminId: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  filters: DashboardFilters;
  performance: DashboardPerformance;
  attractionDistribution: AttractionDistributionItem[];
  recentManagers: RecentManagers;
  appliedFilters: AppliedFilters;
  viewer: DashboardViewer;
}

// ─── Dashboard Query Params 

export type DashboardPeriod = "all" | "today" | "week" | "month" | "year" | "custom";

export interface DashboardQueryParams {
  period?: DashboardPeriod;
  attractionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Legacy (unused going forward) 

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: string;
}
