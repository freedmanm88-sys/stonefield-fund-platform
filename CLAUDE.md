# MIC Fund Management Platform — Stonefield Capital

## Stack
- Next.js 14 (App Router, TypeScript, Tailwind CSS)
- Supabase (PostgreSQL, Auth, Storage)
- Supabase Auth (Google OAuth + email/password)

## Project Structure
```
supabase/migrations/   — SQL schema migrations (run in Supabase dashboard or CLI)
src/app/               — Next.js App Router pages
src/components/        — React components (layout, investors, accounts, ui)
src/lib/supabase/      — Supabase client (browser, server, middleware)
src/lib/types/         — TypeScript types matching DB schema
docs/                  — Spec documents and reference files
```

## Key Design Principles
- **Soft deletes everywhere**: Every table has `deleted_at` + `deleted_by` columns. Nothing is hard-deleted.
- **Immutable audit log**: `audit_log` table written by DB trigger on every write. Cannot be bypassed.
- **Row Level Security**: All tables have RLS enabled. Closed months reject writes at DB layer.
- **Rate history**: Share class rates are never overwritten — new records with `effective_from` dates.
- **Class assignment history**: Account-to-class assignments tracked with `start_date` / `end_date`.

## Brand Colours
- Primary blue: `#4F6EF7`
- Primary black: `#1A1A1A`
- Background: `#FFFFFF`

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — Run ESLint

## Setup
1. Copy `.env.local.example` to `.env.local` and fill in Supabase credentials
2. Run the migration in `supabase/migrations/00001_initial_schema.sql` against your Supabase project
3. Enable Google OAuth in Supabase Auth dashboard
4. `npm run dev`
