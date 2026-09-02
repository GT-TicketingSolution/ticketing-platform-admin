ALTER TABLE "bookings" RENAME COLUMN "attraction_id" TO "attraction_ids";--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_attraction_id_attractions_id_fk";
--> statement-breakpoint
DROP INDEX "bookings_attraction_idx";