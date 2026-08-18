CREATE TYPE "public"."complimentary_pass_status" AS ENUM('ACTIVE', 'USED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."reference_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "complimentary_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"pass_id" varchar(50) NOT NULL,
	"visitor_name" varchar(150) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"attraction_id" uuid NOT NULL,
	"visitors" integer DEFAULT 1 NOT NULL,
	"reference_id" uuid,
	"status" "complimentary_pass_status" DEFAULT 'ACTIVE' NOT NULL,
	"visit_date" date NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complimentary_passes_pass_id_unique" UNIQUE("pass_id")
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
ALTER TABLE "bookings" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_passes" ADD CONSTRAINT "complimentary_passes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complimentary_pass_admin_idx" ON "complimentary_passes" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_attraction_idx" ON "complimentary_passes" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_reference_idx" ON "complimentary_passes" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "complimentary_pass_status_idx" ON "complimentary_passes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "complimentary_pass_deleted_idx" ON "complimentary_passes" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "references_admin_idx" ON "references" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "references_mobile_idx" ON "references" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "references_deleted_idx" ON "references" USING btree ("is_deleted");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;