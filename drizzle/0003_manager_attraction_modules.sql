-- Managers get Scanner Invoices by default, and Attraction Management while
-- at least one attraction is assigned to them. Safe to run more than once.
INSERT INTO "manager_system_module_permissions" ("manager_id", "module_id")
SELECT u."id", sm."id"
FROM "users" u
INNER JOIN "system_modules" sm
  ON sm."key" = 'SCANNER_INVOICES' AND sm."is_active" = 'ACTIVE'
WHERE u."role" = 'MANAGER'
  AND NOT EXISTS (
    SELECT 1 FROM "manager_system_module_permissions" p
    WHERE p."manager_id" = u."id" AND p."module_id" = sm."id"
  );
--> statement-breakpoint
INSERT INTO "manager_system_module_permissions" ("manager_id", "module_id")
SELECT u."id", sm."id"
FROM "users" u
INNER JOIN "system_modules" sm
  ON sm."key" = 'ATTRACTION_MANAGEMENT' AND sm."is_active" = 'ACTIVE'
WHERE u."role" = 'MANAGER'
  AND EXISTS (
    SELECT 1 FROM "manager_attraction_permissions" ap
    WHERE ap."manager_id" = u."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "manager_system_module_permissions" p
    WHERE p."manager_id" = u."id" AND p."module_id" = sm."id"
  );
