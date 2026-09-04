CREATE TABLE "attractions_against_booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"attraction_management_id" uuid NOT NULL,
	"attraction_subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"attraction_gst" numeric(12, 2) DEFAULT '0' NOT NULL,
	"attraction_roundoff" numeric(12, 2) DEFAULT '0' NOT NULL,
	"attraction_round_off_gst_adj" numeric(12, 2) DEFAULT '0' NOT NULL,
	"attraction_totalamount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_of_attraction_against_booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_against_booking_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"no_of_visitors" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" RENAME COLUMN "booking_number" TO "invoice_number";--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_booking_number_unique";--> statement-breakpoint
DROP INDEX "bookings_booking_number_idx";--> statement-breakpoint
DROP INDEX "bookings_customer_name_idx";--> statement-breakpoint
DROP INDEX "bookings_mobile_idx";--> statement-breakpoint
DROP INDEX "bookings_visit_at_idx";--> statement-breakpoint
DROP INDEX "bookings_status_idx";--> statement-breakpoint
ALTER TABLE "attractions_against_booking" ADD CONSTRAINT "attractions_against_booking_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions_against_booking" ADD CONSTRAINT "attractions_against_booking_attraction_management_id_attraction_management_id_fk" FOREIGN KEY ("attraction_management_id") REFERENCES "public"."attraction_management"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_of_attraction_against_booking" ADD CONSTRAINT "category_of_attraction_against_booking_attraction_against_booking_id_attractions_against_booking_id_fk" FOREIGN KEY ("attraction_against_booking_id") REFERENCES "public"."attractions_against_booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_of_attraction_against_booking" ADD CONSTRAINT "category_of_attraction_against_booking_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_of_attraction_against_booking" ADD CONSTRAINT "category_of_attraction_against_booking_category_id_attraction_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."attraction_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attractions_against_booking_booking_id_idx" ON "attractions_against_booking" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "attractions_against_booking_attraction_management_id_idx" ON "attractions_against_booking" USING btree ("attraction_management_id");--> statement-breakpoint
CREATE INDEX "category_attraction_against_booking_attraction_against_booking_id_idx" ON "category_of_attraction_against_booking" USING btree ("attraction_against_booking_id");--> statement-breakpoint
CREATE INDEX "category_attraction_against_booking_booking_id_idx" ON "category_of_attraction_against_booking" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "category_attraction_against_booking_category_id_idx" ON "category_of_attraction_against_booking" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "bookings_invoice_number_idx" ON "bookings" USING btree ("invoice_number");--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "attraction_ids";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "visit_at";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "subtotal";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "gst_amount";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "gst_adjustment";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "round_off";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "discount_amount";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "payment_expires_at";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "payment_mode";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "amount_paid";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "amount_received";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "return_change";--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_invoice_number_unique" UNIQUE("invoice_number");

ALTER TABLE "attraction_management" DROP COLUMN "adult_price";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "child_price";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "student_price";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "senior_price";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "foreigner_price";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "adult_seats";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "child_seats";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "student_seats";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "senior_seats";--> statement-breakpoint
ALTER TABLE "attraction_management" DROP COLUMN "foreigner_seats";