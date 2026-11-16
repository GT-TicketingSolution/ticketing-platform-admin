/**
 * System modules a staff member can hold, and the module each staff role
 * needs. Shared by the staff APIs and the staff form.
 */
export const STAFF_ALLOWED_MODULES = ["TICKET_BOOKING", "SCANNER", "REPORTS"];

const STAFF_ROLE_MODULES: Record<string, string[]> = {
  "Counter Operator": ["TICKET_BOOKING"],
  "Validator": ["SCANNER"],
  "Reports Access": ["REPORTS"],
};

export function getStaffRoleModuleKeys(role: string): string[] {
  const name = role.trim();

  // Older rows store the timing in the name, e.g. "Reports Access (24h)".
  if (name.toLowerCase().startsWith("reports access")) {
    return STAFF_ROLE_MODULES["Reports Access"];
  }

  return STAFF_ROLE_MODULES[name] ?? [];
}
