export interface TicketBookingItem {
  attractionId: string;
  category: string;
  quantity: number;
  price: number;
}

export interface TicketBookingFormData {
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  attractionId: string;
  visitDate: string;
  tickets: TicketBookingItem[];
  paymentMode: "Cash" | "UPI" | "Card" | "Net Banking";
}
