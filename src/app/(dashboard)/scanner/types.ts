export type TicketValidationStatus = "valid" | "used" | "expired" | "invalid";

export interface ScannedTicketData {
  id: string;
  visitor: string;
  type: string;
  date: string;
  attraction: string;
  status: "valid" | "used" | "expired";
}

export interface ScanResult {
  status: TicketValidationStatus;
  ticket?: ScannedTicketData;
  scannedId: string;
}
