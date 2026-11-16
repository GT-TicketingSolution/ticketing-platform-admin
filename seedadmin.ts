// Path: scripts/seed-user.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
async function main() {
  const bcrypt = await import("bcryptjs");
  const { db } = await import("./src/db");
  const { users } = await import("./src/db/schema");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env");
  }
  const password = "admin@123";
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({
      name: "Local Admin",
      email: "local2@admin.com",
      phone: "9876543210",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    })
    .returning();
  console.log("User created successfully:");
  console.log({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    password,
    passwordHash,
  });
}
main()
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });