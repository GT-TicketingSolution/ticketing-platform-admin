CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"gstn" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "system_modules" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_admin_idx" ON "customers" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "customers_mobile_idx" ON "customers" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_gst_idx" ON "customers" USING btree ("gstn");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_admin_mobile_unique" ON "customers" USING btree ("admin_id","mobile");