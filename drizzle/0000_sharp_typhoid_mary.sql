CREATE TYPE "public"."aisle_direction" AS ENUM('VERTICAL', 'HORIZONTAL');--> statement-breakpoint
CREATE TYPE "public"."attraction_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."complimentary_pass_status" AS ENUM('ACTIVE', 'USED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."module_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('CASH', 'UPI', 'CARD', 'ONLINE');--> statement-breakpoint
CREATE TYPE "public"."reference_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."scanner_invoice_status" AS ENUM('UNSCANNED', 'SCANNED');--> statement-breakpoint
CREATE TYPE "public"."seat_layout_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."ticket_scan_verdict" AS ENUM('ALLOWED', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('SUCCESSFUL', 'PENDING', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'MANAGER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "admin_system_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_system_module_permissions_unique" UNIQUE("admin_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "attraction_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_management_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_price" numeric(10, 5) NOT NULL,
	"future_price" numeric(10, 5),
	"effective_from" date,
	"no_of_seats" integer NOT NULL,
	"image_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attraction_category_attraction_management_id_name_unique" UNIQUE("attraction_management_id","name")
);
--> statement-breakpoint
CREATE TABLE "attraction_daily_capacities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"capacity_date" date NOT NULL,
	"total_capacity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attraction_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"inventory_date" date NOT NULL,
	"daily_capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attraction_inventory_attraction_date_unique" UNIQUE("attraction_id","inventory_date")
);
--> statement-breakpoint
CREATE TABLE "attraction_inventory_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"slot_time" time NOT NULL,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attraction_inventory_slot_unique" UNIQUE("inventory_id","slot_time")
);
--> statement-breakpoint
CREATE TABLE "attraction_management" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"description" text,
	"image" text,
	"timing" varchar(100),
	"duration" integer,
	"duration_unit" varchar(20),
	"has_seating" boolean DEFAULT false NOT NULL,
	"seat_layout_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attraction_management_seat_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_management_id" uuid NOT NULL,
	"seat_layout_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attraction_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" "module_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attraction_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"seat_layout_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"seat_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attraction_slot_capacities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time_slot_id" uuid NOT NULL,
	"capacity_date" date NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attraction_time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"slot_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(100) NOT NULL,
	"status" "attraction_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity" varchar(100),
	"entity_id" varchar(100),
	"ip_address" varchar(100),
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"checked_in_by" uuid,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"time_slot_id" uuid,
	"category" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"time_slot_id" uuid NOT NULL,
	"visit_date" date NOT NULL,
	"bogie" varchar(50),
	"seat_number" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"customer_name" varchar(150),
	"mobile_number" varchar(20),
	"gst_number" varchar(20),
	"total_amount" numeric(12, 2) NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"amount_received" numeric(12, 2) DEFAULT '0' NOT NULL,
	"return_change" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_invoice_number_unique" UNIQUE("invoice_number")
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
CREATE TABLE "complimentary_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"pass_id" varchar(50) NOT NULL,
	"visit_date" date NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"visitor_name" varchar(150) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"department" varchar(100),
	"designation" varchar(100),
	"adults" integer DEFAULT 0 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"visitors" integer DEFAULT 1 NOT NULL,
	"attraction_id" uuid NOT NULL,
	"reference_id" uuid,
	"status" "complimentary_pass_status" DEFAULT 'ACTIVE' NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complimentary_passes_pass_id_unique" UNIQUE("pass_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"gstn" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_attraction_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"attraction_module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_attraction_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_system_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"reference_name" varchar(150) NOT NULL,
	"department" varchar(100),
	"contact_person" varchar(150) NOT NULL,
	"post" varchar(100),
	"mobile" varchar(20) NOT NULL,
	"status" "reference_status" DEFAULT 'ACTIVE' NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scanner_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"scanner_invoice_status" "scanner_invoice_status" DEFAULT 'UNSCANNED' NOT NULL,
	"scanned_by_staff_id" uuid,
	"scanned_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scanner_invoice_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "seat_booking_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"trip_no" integer NOT NULL,
	"seat_no" integer NOT NULL,
	"attraction_seat_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "seat_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"rows" integer NOT NULL,
	"cols" integer NOT NULL,
	"has_aisle" boolean NOT NULL,
	"aisle_direction" "aisle_direction" DEFAULT 'VERTICAL' NOT NULL,
	"aisle_after_col" integer,
	"aisle_after_row" integer,
	"status" "seat_layout_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_attraction_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"role" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_system_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_module_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" "module_status" DEFAULT 'ACTIVE' NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_modules_key_unique" UNIQUE("key")
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
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"invoice_number" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"status" "transaction_status" DEFAULT 'SUCCESSFUL' NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"manager_id" uuid,
	"name" varchar(150) NOT NULL,
	"business_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'STAFF' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"phone" varchar(20),
	"gst" varchar(15),
	"cin" varchar(21),
	"profile_link" text,
	"invoice_number_for_user_initial_part" varchar(11),
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_system_module_permissions" ADD CONSTRAINT "admin_system_module_permissions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_system_module_permissions" ADD CONSTRAINT "admin_system_module_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_category" ADD CONSTRAINT "attraction_category_attraction_management_id_attraction_management_id_fk" FOREIGN KEY ("attraction_management_id") REFERENCES "public"."attraction_management"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_daily_capacities" ADD CONSTRAINT "attraction_daily_capacities_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_inventory" ADD CONSTRAINT "attraction_inventory_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_inventory_slots" ADD CONSTRAINT "attraction_inventory_slots_inventory_id_attraction_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."attraction_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD CONSTRAINT "attraction_management_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD CONSTRAINT "attraction_management_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD CONSTRAINT "attraction_management_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management_seat_layouts" ADD CONSTRAINT "attraction_management_seat_layouts_attraction_management_id_attraction_management_id_fk" FOREIGN KEY ("attraction_management_id") REFERENCES "public"."attraction_management"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management_seat_layouts" ADD CONSTRAINT "attraction_management_seat_layouts_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_modules" ADD CONSTRAINT "attraction_modules_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_seats" ADD CONSTRAINT "attraction_seats_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_seats" ADD CONSTRAINT "attraction_seats_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_slot_capacities" ADD CONSTRAINT "attraction_slot_capacities_time_slot_id_attraction_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."attraction_time_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_time_slots" ADD CONSTRAINT "attraction_time_slots_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions" ADD CONSTRAINT "attractions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions_against_booking" ADD CONSTRAINT "attractions_against_booking_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions_against_booking" ADD CONSTRAINT "attractions_against_booking_attraction_management_id_attraction_management_id_fk" FOREIGN KEY ("attraction_management_id") REFERENCES "public"."attraction_management"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checkins" ADD CONSTRAINT "booking_checkins_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checkins" ADD CONSTRAINT "booking_checkins_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_time_slot_id_attraction_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."attraction_time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_time_slot_id_attraction_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."attraction_time_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_of_attraction_against_booking" ADD CONSTRAINT "category_of_attraction_against_booking_attraction_against_booking_id_attractions_against_booking_id_fk" FOREIGN KEY ("attraction_against_booking_id") REFERENCES "public"."attractions_against_booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_of_attraction_against_booking" ADD CONSTRAINT "category_of_attraction_against_booking_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_of_attraction_against_booking" ADD CONSTRAINT "category_of_attraction_against_booking_category_id_attraction_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."attraction_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_module_permissions" ADD CONSTRAINT "manager_attraction_module_permissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_module_permissions" ADD CONSTRAINT "manager_attraction_module_permissions_attraction_module_id_attraction_modules_id_fk" FOREIGN KEY ("attraction_module_id") REFERENCES "public"."attraction_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_permissions" ADD CONSTRAINT "manager_attraction_permissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_permissions" ADD CONSTRAINT "manager_attraction_permissions_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_system_module_permissions" ADD CONSTRAINT "manager_system_module_permissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_system_module_permissions" ADD CONSTRAINT "manager_system_module_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_invoice" ADD CONSTRAINT "scanner_invoice_scanned_by_staff_id_users_id_fk" FOREIGN KEY ("scanned_by_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_invoice" ADD CONSTRAINT "scanner_invoice_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_booking_history" ADD CONSTRAINT "seat_booking_history_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_booking_history" ADD CONSTRAINT "seat_booking_history_attraction_seat_id_attraction_seats_id_fk" FOREIGN KEY ("attraction_seat_id") REFERENCES "public"."attraction_seats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_layout_seats" ADD CONSTRAINT "seat_layout_seats_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attraction_assignments" ADD CONSTRAINT "staff_attraction_assignments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attraction_assignments" ADD CONSTRAINT "staff_attraction_assignments_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_system_module_permissions" ADD CONSTRAINT "staff_system_module_permissions_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_system_module_permissions" ADD CONSTRAINT "staff_system_module_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_module_role_permissions" ADD CONSTRAINT "system_module_role_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scan_logs" ADD CONSTRAINT "ticket_scan_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_scan_logs" ADD CONSTRAINT "ticket_scan_logs_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attraction_daily_capacity_attraction_idx" ON "attraction_daily_capacities" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_daily_capacity_date_idx" ON "attraction_daily_capacities" USING btree ("capacity_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_daily_capacity_attraction_date_unique" ON "attraction_daily_capacities" USING btree ("attraction_id","capacity_date");--> statement-breakpoint
CREATE INDEX "attraction_management_admin_idx" ON "attraction_management" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "attraction_management_attraction_idx" ON "attraction_management" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_management_seat_layout_idx" ON "attraction_management" USING btree ("seat_layout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_management_admin_attraction_unique" ON "attraction_management" USING btree ("admin_id","attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_management_seat_layout_attraction_idx" ON "attraction_management_seat_layouts" USING btree ("attraction_management_id");--> statement-breakpoint
CREATE INDEX "attraction_management_seat_layout_layout_idx" ON "attraction_management_seat_layouts" USING btree ("seat_layout_id");--> statement-breakpoint
CREATE INDEX "attraction_modules_attraction_idx" ON "attraction_modules" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_modules_key_idx" ON "attraction_modules" USING btree ("key");--> statement-breakpoint
CREATE INDEX "attraction_slot_capacity_slot_idx" ON "attraction_slot_capacities" USING btree ("time_slot_id");--> statement-breakpoint
CREATE INDEX "attraction_slot_capacity_date_idx" ON "attraction_slot_capacities" USING btree ("capacity_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_slot_capacity_slot_date_unique" ON "attraction_slot_capacities" USING btree ("time_slot_id","capacity_date");--> statement-breakpoint
CREATE INDEX "attraction_time_slots_attraction_idx" ON "attraction_time_slots" USING btree ("attraction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_time_slots_attraction_slot_unique" ON "attraction_time_slots" USING btree ("attraction_id","slot_time");--> statement-breakpoint
CREATE UNIQUE INDEX "attractions_name_unique_idx" ON "attractions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "attractions_admin_idx" ON "attractions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "attractions_status_idx" ON "attractions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attractions_against_booking_booking_id_idx" ON "attractions_against_booking" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "attractions_against_booking_attraction_management_id_idx" ON "attractions_against_booking" USING btree ("attraction_management_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_checkins_booking_idx" ON "booking_checkins" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_checkins_checked_in_by_idx" ON "booking_checkins" USING btree ("checked_in_by");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_checkins_booking_unique" ON "booking_checkins" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_items_booking_idx" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_seats_booking_idx" ON "booking_seats" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_seats_slot_date_idx" ON "booking_seats" USING btree ("time_slot_id","visit_date");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_seats_slot_date_seat_unique" ON "booking_seats" USING btree ("time_slot_id","visit_date","bogie","seat_number");--> statement-breakpoint
CREATE INDEX "bookings_invoice_number_idx" ON "bookings" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "category_attraction_against_booking_attraction_against_booking_id_idx" ON "category_of_attraction_against_booking" USING btree ("attraction_against_booking_id");--> statement-breakpoint
CREATE INDEX "category_attraction_against_booking_booking_id_idx" ON "category_of_attraction_against_booking" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "category_attraction_against_booking_category_id_idx" ON "category_of_attraction_against_booking" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_admin_idx" ON "complimentary_passes" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_attraction_idx" ON "complimentary_passes" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_reference_idx" ON "complimentary_passes" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_status_idx" ON "complimentary_passes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "complimentary_pass_deleted_idx" ON "complimentary_passes" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "customers_admin_idx" ON "customers" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "customers_mobile_idx" ON "customers" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_gst_idx" ON "customers" USING btree ("gstn");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_admin_mobile_unique" ON "customers" USING btree ("admin_id","mobile");--> statement-breakpoint
CREATE INDEX "manager_attraction_module_permissions_manager_idx" ON "manager_attraction_module_permissions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "manager_attraction_module_permissions_module_idx" ON "manager_attraction_module_permissions" USING btree ("attraction_module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_attraction_module_unique" ON "manager_attraction_module_permissions" USING btree ("manager_id","attraction_module_id");--> statement-breakpoint
CREATE INDEX "manager_attraction_permissions_manager_idx" ON "manager_attraction_permissions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "manager_attraction_permissions_attraction_idx" ON "manager_attraction_permissions" USING btree ("attraction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_attraction_unique" ON "manager_attraction_permissions" USING btree ("manager_id","attraction_id");--> statement-breakpoint
CREATE INDEX "manager_system_permissions_manager_idx" ON "manager_system_module_permissions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "manager_system_permissions_module_idx" ON "manager_system_module_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_system_module_unique" ON "manager_system_module_permissions" USING btree ("manager_id","module_id");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_token_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "references_admin_idx" ON "references" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "references_mobile_idx" ON "references" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "references_deleted_idx" ON "references" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "scanner_invoices_invoice_number_idx" ON "scanner_invoice" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "scanner_invoices_scanned_by_staff_idx" ON "scanner_invoice" USING btree ("scanned_by_staff_id");--> statement-breakpoint
CREATE INDEX "seat_booking_history_attraction_idx" ON "seat_booking_history" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "seat_booking_history_trip_idx" ON "seat_booking_history" USING btree ("trip_no");--> statement-breakpoint
CREATE INDEX "seat_booking_history_attraction_seat_idx" ON "seat_booking_history" USING btree ("attraction_seat_id");--> statement-breakpoint
CREATE INDEX "seat_booking_history_attraction_trip_idx" ON "seat_booking_history" USING btree ("attraction_id","trip_no");--> statement-breakpoint
CREATE INDEX "seat_layout_seats_layout_idx" ON "seat_layout_seats" USING btree ("seat_layout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seat_layout_seats_unique" ON "seat_layout_seats" USING btree ("seat_layout_id","seat_number");--> statement-breakpoint
CREATE INDEX "seat_layouts_admin_idx" ON "seat_layouts" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "seat_layouts_name_idx" ON "seat_layouts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "seat_layouts_status_idx" ON "seat_layouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "staff_attraction_staff_idx" ON "staff_attraction_assignments" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_attraction_attraction_idx" ON "staff_attraction_assignments" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "staff_roles_staff_idx" ON "staff_roles" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_system_module_permissions_staff_idx" ON "staff_system_module_permissions" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_system_module_permissions_module_idx" ON "staff_system_module_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_system_module_permissions_staff_module_unique" ON "staff_system_module_permissions" USING btree ("staff_id","module_id");--> statement-breakpoint
CREATE INDEX "system_module_role_permissions_role_idx" ON "system_module_role_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "system_module_role_permissions_module_idx" ON "system_module_role_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_module_role_permissions_role_module_unique" ON "system_module_role_permissions" USING btree ("role","module_id");--> statement-breakpoint
CREATE INDEX "system_modules_key_idx" ON "system_modules" USING btree ("key");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_booking_idx" ON "ticket_scan_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_scanned_code_idx" ON "ticket_scan_logs" USING btree ("scanned_code");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_scanned_by_idx" ON "ticket_scan_logs" USING btree ("scanned_by");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_scanned_at_idx" ON "ticket_scan_logs" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "ticket_scan_logs_verdict_idx" ON "ticket_scan_logs" USING btree ("verdict");--> statement-breakpoint
CREATE INDEX "transactions_booking_idx" ON "transactions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_admin_idx" ON "users" USING btree ("admin_id");