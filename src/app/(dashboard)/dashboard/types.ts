export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  tickets: number;
}

export interface RecentBookingItem {
  id: string;
  customerName: string;
  attraction: string;
  amount: number;
  status: string;
  date: string;
}
