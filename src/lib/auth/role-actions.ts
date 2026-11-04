                                                                                                            /**
 * Role restricted actions, shared by the APIs and the screens.
 *
 * To open an action to another role, add the role here. The API check and
 * the button visibility both follow this list.
 */
export type AppRole = "ADMIN" | "MANAGER" | "STAFF";

const ROLE_ACTIONS = {
  ATTRACTION_CREATE: ["ADMIN"],
  ATTRACTION_BULK_UPLOAD: ["ADMIN"],
  ATTRACTION_DELETE: ["ADMIN"],
  INVOICE_DELETE: ["ADMIN"],
  SEAT_LAYOUT_MANAGE: ["ADMIN"],
} as const satisfies Record<string, readonly AppRole[]>;

export type RoleAction = keyof typeof ROLE_ACTIONS;

export function canPerformRoleAction(
  role: string | null | undefined,
  action: RoleAction,
): boolean {
  return (ROLE_ACTIONS[action] as readonly string[]).includes(role ?? "");
}
