CREATE TYPE "public"."ticket_scan_verdict" AS ENUM('ALLOWED', 'DENIED');--> statement-breakpoint
CREATE TABLE "admin_system_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_system_module_permissions_unique" UNIQUE("admin_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "booking_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"checked_in_by" uuid,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_layout_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seat_layout_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"col_number" integer NOT NULL,
	"bogie" varchar(50),
	"seat_number" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_scan_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"scanned_code" varchar(255) NOT NULL,
	"scanned_by" uuid NOT NULL,
	"visitors_count" integer DEFAULT 1 NOT NULL,
	"verdict" "ticket_scan_verdict" NOT NULL,
	"reason" text,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::text;--> statement-breakpoint
DROP TYPE "public"."user_status";--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."user_status";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE "public"."user_status" USING "status"::"public"."user_status";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "customer_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "mobile_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "attraction_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "time_slot_id" uuid;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD COLUMN "time_slot_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD COLUMN "visit_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "subtotal" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "gst_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "gst_adjustment" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "round_off" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD COLUMN "designation" varchar(100);--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD COLUMN "adults" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD COLUMN "children" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "business_name" varchar(255);--> statement-breakpoint
ALTER TABLE "admin_system_module_permissions" ADD CONSTRAINT "admin_system_module_permissions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_system_module_permissions" ADD CONSTRAINT "admin_system_module_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checkins" ADD CONSTRAINT "booking_checkins_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checkins" ADD CONSTRAINT "booking_checkins_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_layout_seats" ADD CONSTRAINT "seat_layout_seats_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scan_logs" ADD CONSTRAINT "ticket_scan_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scan_logs" ADD CONSTRAINT "ticket_scan_logs_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_checkins_booking_idx" ON "booking_checkins" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_checkins_checked_in_by_idx" ON "booking_checkins" USING btree ("checked_in_by");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_checkins_booking_unique" ON "booking_checkins" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "seat_layout_seats_layout_idx" ON "seat_layout_seats" USING btree ("seat_layout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seat_layout_seats_unique" ON "seat_layout_seats" USING btree ("seat_layout_id","seat_number");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_booking_idx" ON "ticket_scan_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_scanned_code_idx" ON "ticket_scan_logs" USING btree ("scanned_code");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_scanned_by_idx" ON "ticket_scan_logs" USING btree ("scanned_by");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_scanned_at_idx" ON "ticket_scan_logs" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_verdict_idx" ON "ticket_scan_logs" USING btree ("verdict");--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_time_slot_id_attraction_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."attraction_time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_time_slot_id_attraction_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."attraction_time_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_seats_slot_date_idx" ON "booking_seats" USING btree ("time_slot_id","visit_date");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_seats_slot_date_seat_unique" ON "booking_seats" USING btree ("time_slot_id","visit_date","bogie","seat_number");