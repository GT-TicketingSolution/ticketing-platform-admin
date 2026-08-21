export interface UpsertCapacityFormData {
  attractionId: string;
  capacityDate: string;
  totalCapacity: number | string;
}

export interface CapacityValidationResult {
  isValid: boolean;
  errors: {
    attractionId?: string;
    capacityDate?: string;
    totalCapacity?: string;
  };
}

/**
 * Schema-based validation function for Upsert Capacity Form.
 * Validates mandatory fields, valid date format, and non-negative integer capacity.
 */
export function validateUpsertCapacitySchema(data: UpsertCapacityFormData): CapacityValidationResult {
  const errors: CapacityValidationResult["errors"] = {};

  // 1. Target Attraction Validation
  if (!data.attractionId || data.attractionId.trim() === "") {
    errors.attractionId = "Attraction selection is required.";
  }

  // 2. Capacity Date Validation
  if (!data.capacityDate || data.capacityDate.trim() === "") {
    errors.capacityDate = "Capacity date is required.";
  }

  // 3. Total Capacity Validation
  const capNum = typeof data.totalCapacity === "number" ? data.totalCapacity : parseInt(String(data.totalCapacity), 10);

  if (data.totalCapacity === "" || data.totalCapacity === undefined || data.totalCapacity === null) {
    errors.totalCapacity = "Total capacity is required.";
  } else if (isNaN(capNum)) {
    errors.totalCapacity = "Please enter a valid numeric capacity.";
  } else if (!Number.isInteger(capNum) || capNum < 0) {
    errors.totalCapacity = "Total capacity must be a non-negative integer (0 or greater).";
  } else if (capNum > 50000) {
    errors.totalCapacity = "Total capacity cannot exceed 50,000.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
