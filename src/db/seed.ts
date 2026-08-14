import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { systemModules, attractions, attractionModules } from "@/db/schema";

const SYSTEM_MODULES = [
  {
    key: "bookings",
    name: "Bookings",
    description: "View & manage bookings",
  },
  {
    key: "transactions",
    name: "Transactions",
    description: "Financial & payment records",
  },
  {
    key: "records_reports",
    name: "Records / Reports",
    description: "Sales & revenue analytics",
  },
  {
    key: "invoices",
    name: "Invoices",
    description: "Tax invoices & billing receipts",
  },
  {
    key: "inventory_capacity",
    name: "Inventory / Capacity",
    description: "Capacity & ticket inventory",
  },
  {
    key: "staff_management",
    name: "Staff Management",
    description: "Create & manage counter staff",
  },
];

const ATTRACTIONS = [
  {
    name: "Toy Train",
    type: "Ride",
  },
  {
    name: "Ropeway",
    type: "Ride",
  },
  {
    name: "Wax Museum",
    type: "Museum",
  },
  {
    name: "Biological Park",
    type: "Park",
  },
  {
    name: "Sheesh Mahal",
    type: "Monument",
  },
  {
    name: "Fort Entry",
    type: "Fort",
  },
];

const ATTRACTION_MODULES = [
  {
    key: "counter_assignment",
    name: "Counter Assignment",
  },
  {
    key: "customer_management",
    name: "Customer Management",
  },
  {
    key: "complimentary_passes",
    name: "Complimentary Passes",
  },
  {
    key: "user_management",
    name: "User Management",
  },
  {
    key: "cctv_monitoring",
    name: "CCTV Monitoring",
  },
];

async function seed() {
  console.log("Seeding system modules...");

  for (const module of SYSTEM_MODULES) {
    await db.insert(systemModules).values(module).onConflictDoNothing({
      target: systemModules.key,
    });
  }

  console.log("Seeding attractions...");

  for (const attraction of ATTRACTIONS) {
    let [attractionRecord] = await db
      .select()
      .from(attractions)
      .where(eq(attractions.name, attraction.name))
      .limit(1);

    if (!attractionRecord) {
      [attractionRecord] = await db
        .insert(attractions)
        .values(attraction)
        .returning();
    }

    if (!attractionRecord) continue;

    for (const module of ATTRACTION_MODULES) {
      const [existingModule] = await db
        .select()
        .from(attractionModules)
        .where(
          and(
            eq(attractionModules.attractionId, attractionRecord.id),
            eq(attractionModules.key, module.key),
          ),
        )
        .limit(1);

      if (!existingModule) {
        await db.insert(attractionModules).values({
          attractionId: attractionRecord.id,
          key: module.key,
          name: module.name,
          description: null,
        });
      }
    }
  }

  console.log("Seed completed.");
}

seed()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
