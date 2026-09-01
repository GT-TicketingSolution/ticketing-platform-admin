import "dotenv/config";
import pkg from "pg";
const { Client } = pkg;

console.log("Testing database connection...");
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "✓ Loaded" : "✗ Not found",
);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();
  console.log("✓ Database connection successful!");
  await client.end();
} catch (err) {
  console.error("✗ Connection failed:", err.message);
}
