ALTER TABLE "seat_layouts" ALTER COLUMN "aisle_after_col" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "seat_layouts" ALTER COLUMN "aisle_after_col" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_layouts" ALTER COLUMN "aisle_after_row" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "seat_layouts" ALTER COLUMN "aisle_after_row" DROP NOT NULL;