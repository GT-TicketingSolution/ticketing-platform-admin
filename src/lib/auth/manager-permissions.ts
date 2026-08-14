import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  managerSystemModulePermissions,
  managerAttractionPermissions,
  managerAttractionModulePermissions,
  systemModules,
  attractions,
  attractionModules,
} from "@/db/schema";

export async function hasSystemModulePermission(
  managerId: string,
  moduleKey: string,
) {
  const [permission] = await db
    .select({
      id: managerSystemModulePermissions.id,
    })
    .from(managerSystemModulePermissions)
    .innerJoin(
      systemModules,
      eq(managerSystemModulePermissions.moduleId, systemModules.id),
    )
    .where(
      and(
        eq(managerSystemModulePermissions.managerId, managerId),
        eq(systemModules.key, moduleKey),
        eq(systemModules.isActive, "ACTIVE"),
      ),
    )
    .limit(1);

  return !!permission;
}

export async function hasAttractionPermission(
  managerId: string,
  attractionId: string,
) {
  const [permission] = await db
    .select({
      id: managerAttractionPermissions.id,
    })
    .from(managerAttractionPermissions)
    .innerJoin(
      attractions,
      eq(managerAttractionPermissions.attractionId, attractions.id),
    )
    .where(
      and(
        eq(managerAttractionPermissions.managerId, managerId),
        eq(managerAttractionPermissions.attractionId, attractionId),
        eq(attractions.status, "ACTIVE"),
      ),
    )
    .limit(1);

  return !!permission;
}

export async function hasAttractionModulePermission(
  managerId: string,
  attractionModuleId: string,
) {
  const [permission] = await db
    .select({
      id: managerAttractionModulePermissions.id,
    })
    .from(managerAttractionModulePermissions)
    .innerJoin(
      attractionModules,
      eq(
        managerAttractionModulePermissions.attractionModuleId,
        attractionModules.id,
      ),
    )
    .where(
      and(
        eq(managerAttractionModulePermissions.managerId, managerId),
        eq(
          managerAttractionModulePermissions.attractionModuleId,
          attractionModuleId,
        ),
        eq(attractionModules.isActive, "ACTIVE"),
      ),
    )
    .limit(1);

  return !!permission;
}

export async function requireSystemModulePermission(
  managerId: string,
  moduleKey: string,
) {
  const allowed = await hasSystemModulePermission(managerId, moduleKey);

  if (!allowed) {
    throw new Error("SYSTEM_MODULE_ACCESS_DENIED");
  }
}

export async function requireAttractionPermission(
  managerId: string,
  attractionId: string,
) {
  const allowed = await hasAttractionPermission(managerId, attractionId);

  if (!allowed) {
    throw new Error("ATTRACTION_ACCESS_DENIED");
  }
}

export async function requireAttractionModulePermission(
  managerId: string,
  attractionModuleId: string,
) {
  const allowed = await hasAttractionModulePermission(
    managerId,
    attractionModuleId,
  );

  if (!allowed) {
    throw new Error("ATTRACTION_MODULE_ACCESS_DENIED");
  }
}
