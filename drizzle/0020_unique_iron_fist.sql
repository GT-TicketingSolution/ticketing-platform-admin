CREATE TYPE "public"."aisle_direction" AS ENUM('VERTICAL', 'HORIZONTAL');--> statement-breakpoint
DROP INDEX "attractions_name_idx";--> statement-breakpoint
ALTER TABLE "seat_layouts" ALTER COLUMN "aisle_after_col" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "seat_layouts" ALTER COLUMN "aisle_after_col" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_layouts" ADD COLUMN "aisle_direction" "aisle_direction" DEFAULT 'VERTICAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_layouts" ADD COLUMN "aisle_after_row" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "attractions_name_unique_idx" ON "attractions" USING btree ("name");