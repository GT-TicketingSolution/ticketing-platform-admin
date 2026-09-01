import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

console.log("Connecting to database...");

try {
  await client.connect();

  console.log("CONNECTED!");

  const result = await client.query(`
    SELECT current_database(), current_user
  `);

  console.log(result.rows);

  await client.end();

  console.log("DONE!");
} catch (error) {
  console.error("DATABASE ERROR:");
  console.error(error);
  process.exit(1);
}
