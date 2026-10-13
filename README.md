# Recipe Planner

A personal kitchen app that ties recipes, pantry stock, meal planning and grocery shopping together, so the answer to "what's for dinner?" comes from what's actually in the cupboard.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript** and **Prisma**, deployed on **Vercel** with a **Turso** (libSQL) database. Installable as a PWA.

## Features

- **Recipe import**: paste a URL (parses schema.org JSON-LD), paste plain text, or upload a PDF. A hand-written parser handles ingredient lines, quantities, units and durations, with no AI involved.
- **Pantry tracking** with stock levels and per-ingredient storage advice
- **"What can I make?"**: matches recipes against the pantry, including sensible substitutions (e.g. unsalted butter for butter)
- **Daily suggestions** that favour ingredients running low and add variety across the week
- **Meal planner** with a weekly view and serving scaling
- **Shopping list** grouped by store category, generated from the plan and pantry gaps
- **Receipt scanning**: photograph a receipt and OCR (tesseract.js, runs locally, free) logs the trip and per-item prices for cost tracking and estimates
- **Barcode scanning**: pulls product nutrition and ingredients from the Open Food Facts API
- **Cook mode** with step-by-step instructions, and a cook log
- **Backup and restore** of all data to a portable JSON file

## Tech notes

- Server Actions for mutations, with no separate API layer
- Prisma with the libSQL driver adapter (SQLite locally, Turso in production)
- Image compression on the client before upload to stay within serverless body limits
- Backups reference entities by stable natural keys (names, barcodes) instead of database IDs, so they restore cleanly into a fresh database

## Running locally

```bash
npm install
npx prisma migrate dev
npm run db:seed     # optional sample data
npm run dev
```

Environment variables (`.env`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./prisma/dev.db` locally, or a `libsql://` Turso URL |
| `TURSO_AUTH_TOKEN` | Turso auth token (production only) |
