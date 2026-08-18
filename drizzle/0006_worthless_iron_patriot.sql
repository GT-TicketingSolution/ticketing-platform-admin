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
ALTER TABLE "attraction_daily_capacities" ADD CONSTRAINT "attraction_daily_capacities_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_inventory" ADD CONSTRAINT "attraction_inventory_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_inventory_slots" ADD CONSTRAINT "attraction_inventory_slots_inventory_id_attraction_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."attraction_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_slot_capacities" ADD CONSTRAINT "attraction_slot_capacities_time_slot_id_attraction_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."attraction_time_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_time_slots" ADD CONSTRAINT "attraction_time_slots_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attraction_daily_capacity_attraction_idx" ON "attraction_daily_capacities" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_daily_capacity_date_idx" ON "attraction_daily_capacities" USING btree ("capacity_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_daily_capacity_attraction_date_unique" ON "attraction_daily_capacities" USING btree ("attraction_id","capacity_date");--> statement-breakpoint
CREATE INDEX "attraction_slot_capacity_slot_idx" ON "attraction_slot_capacities" USING btree ("time_slot_id");--> statement-breakpoint
CREATE INDEX "attraction_slot_capacity_date_idx" ON "attraction_slot_capacities" USING btree ("capacity_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_slot_capacity_slot_date_unique" ON "attraction_slot_capacities" USING btree ("time_slot_id","capacity_date");--> statement-breakpoint
CREATE INDEX "attraction_time_slots_attraction_idx" ON "attraction_time_slots" USING btree ("attraction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_time_slots_attraction_slot_unique" ON "attraction_time_slots" USING btree ("attraction_id","slot_time");