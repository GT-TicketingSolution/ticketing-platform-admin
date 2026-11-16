This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Migrations (Drizzle ORM)

This project uses **Drizzle ORM** with migration files managed in the `drizzle/` directory.

### When Pulling Updates (Applying Existing Migrations)
Whenever you pull new commits from `dev` or `main` that include new migration files:

```bash
npm run db:migrate
```
> This runs `drizzle-kit migrate`, compares pending SQL migrations against the database tracking table, and applies unapplied migrations in order.

### When Adding / Modifying Database Schema
If you change or add tables/columns in `src/db/schema.ts`:

1. **Generate the migration file:**
   ```bash
   npm run db:generate
   ```
   *This compares `src/db/schema.ts` against the previous snapshot and generates a new `.sql` file in `drizzle/` and updates `drizzle/meta/_journal.json`.*

2. **Apply the migration to your local database:**
   ```bash
   npm run db:migrate
   ```

3. **Commit the migration files to Git:**
   Always commit both the generated SQL file and the `drizzle/meta/` updates:
   ```bash
   git add drizzle/
   git commit -m "feat(db): add <table_name> migration"
   ```
   *When merged into `dev`, running `npm run db:migrate` on the dev server/pipeline will automatically apply the migration without manual SQL scripts.*

## Useful Database Commands

| Command | Description |
| :--- | :--- |
| `npm run db:generate` | Generates a new SQL migration file based on changes in `src/db/schema.ts` |
| `npm run db:migrate` | Applies all pending migrations from `drizzle/` to the database |
| `npm run db:push` | Directly synchronizes schema with the database (development/prototyping only) |
| `npm run db:seed` | Seeds the initial admin user into the database |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
