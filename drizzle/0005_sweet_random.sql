CREATE TYPE "public"."transaction_status" AS ENUM('SUCCESSFUL', 'PENDING', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_number" varchar(50) NOT NULL,
	"booking_id" uuid NOT NULL,
	"invoice_number" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"status" "transaction_status" DEFAULT 'SUCCESSFUL' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_number_unique" UNIQUE("transaction_number")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_transaction_number_idx" ON "transactions" USING btree ("transaction_number");--> statement-breakpoint
CREATE INDEX "transactions_booking_idx" ON "transactions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "transactions_payment_mode_idx" ON "transactions" USING btree ("payment_mode");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_deleted_at_idx" ON "transactions" USING btree ("deleted_at");