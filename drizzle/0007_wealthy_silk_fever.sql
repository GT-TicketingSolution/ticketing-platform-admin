CREATE TYPE "public"."seat_layout_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "seat_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"rows" integer NOT NULL,
	"cols" integer NOT NULL,
	"has_aisle" boolean NOT NULL,
	"aisle_after_col" integer DEFAULT 0 NOT NULL,
	"status" "seat_layout_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "seat_layouts_name_idx" ON "seat_layouts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "seat_layouts_status_idx" ON "seat_layouts" USING btree ("status");