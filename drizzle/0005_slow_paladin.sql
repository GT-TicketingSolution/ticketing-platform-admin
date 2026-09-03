CREATE TYPE "public"."scanner_invoice_status" AS ENUM('UNSCANNED', 'SCANNED');--> statement-breakpoint
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
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_transaction_number_unique";--> statement-breakpoint
DROP INDEX "transactions_transaction_number_idx";--> statement-breakpoint
DROP INDEX "transactions_payment_mode_idx";--> statement-breakpoint
DROP INDEX "transactions_status_idx";--> statement-breakpoint
DROP INDEX "transactions_created_at_idx";--> statement-breakpoint
DROP INDEX "transactions_deleted_at_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gst" varchar(15);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cin" varchar(21);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_link" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invoice_number_for_user_initial_part" varchar(11);--> statement-breakpoint
ALTER TABLE "attraction_category" ADD CONSTRAINT "attraction_category_attraction_management_id_attraction_management_id_fk" FOREIGN KEY ("attraction_management_id") REFERENCES "public"."attraction_management"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_invoice" ADD CONSTRAINT "scanner_invoice_scanned_by_staff_id_users_id_fk" FOREIGN KEY ("scanned_by_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_invoice" ADD CONSTRAINT "scanner_invoice_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scanner_invoices_invoice_number_idx" ON "scanner_invoice" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "scanner_invoices_scanned_by_staff_idx" ON "scanner_invoice" USING btree ("scanned_by_staff_id");--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "transaction_number";