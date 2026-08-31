CREATE TYPE "public"."aisle_direction" AS ENUM('VERTICAL', 'HORIZONTAL');--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "adult_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "child_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "student_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "senior_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "foreigner_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management_seat_layouts" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_layouts" ADD COLUMN "aisle_direction" "aisle_direction" DEFAULT 'VERTICAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_layouts" ADD COLUMN "aisle_after_row" integer DEFAULT 0 NOT NULL;