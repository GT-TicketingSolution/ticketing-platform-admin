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

/**
 * Schema-based validation function for Add Capacity Form.
 * Validates mandatory fields, numeric seat ranges, and selection requirements.
 */
export function validateAddCapacitySchema(data: AddCapacityFormData): CapacityValidationResult {
  const errors: CapacityValidationResult["errors"] = {};

  // 1. Target Attraction Validation
  if (!data.targetId || data.targetId.trim() === "") {
    errors.targetId = "Attraction selection is required.";
  }

  // 2. Time Slot Allocation Validation
  if (!data.selectedSlot || data.selectedSlot.trim() === "") {
    errors.selectedSlot = "Time slot allocation is required.";
  }

  // 3. Additional Seats Count Validation
  const seatNum = typeof data.addedSeats === "number" ? data.addedSeats : parseInt(String(data.addedSeats), 10);

  if (data.addedSeats === "" || data.addedSeats === undefined || data.addedSeats === null) {
    errors.addedSeats = "Additional seats count is required.";
  } else if (isNaN(seatNum)) {
    errors.addedSeats = "Please enter a valid numeric seat amount.";
  } else if (seatNum <= 0) {
    errors.addedSeats = "Seat count must be greater than 0.";
  } else if (seatNum > 5000) {
    errors.addedSeats = "Seat count cannot exceed 5,000 per single update.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
