export interface OverallReportSummary {
  totalRevenue: number;
  totalTickets: number;
  totalVisitors: number;
  activeAttractions: number;
  growthRate?: number;
}

export interface AttractionReportStats {
  attractionId: string;
  attractionName: string;
  totalTickets: number;
  totalRevenue: number;
  occupancyRate: number;
}
