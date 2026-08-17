export interface AddCapacityFormData {
  targetId: string;
  selectedSlot: string;
  addedSeats: number | string;
}

export interface CapacityValidationResult {
  isValid: boolean;
  errors: {
    targetId?: string;
    selectedSlot?: string;
    addedSeats?: string;
  };
}

export interface InventorySlotItem {
  id: string;
  attractionId: string;
  attractionName: string;
  slotTime: string;
  totalCapacity: number;
  bookedCapacity: number;
  availableCapacity: number;
  status: "Available" | "Filling Fast" | "Sold Out";
}
