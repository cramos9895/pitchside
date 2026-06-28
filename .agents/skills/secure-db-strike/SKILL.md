---
name: secure-db-strike
description: Use this skill when creating or modifying database schemas, tables, relationships, or executing SQL migrations.
---

# Secure DB Strike Protocol

Ensure all database operations are executed cleanly, securely, and in accordance with the project's strict migration and RLS standards.

## 1. Migration File Generation
- Place all database changes (schema updates, RLS policy changes, seeds) in `./supabase/migrations/`.
- Use the standard Supabase timestamp naming convention: `YYYYMMDDHHMMSS_description.sql`.
- Ensure migrations are atomic (a single, complete, runnable unit of change).

## 2. Row Level Security (RLS) - "The Wall of RLS"
- **NEVER** propose or write database schema changes without an accompanying Row Level Security (RLS) policy.
- Write the corresponding RLS policy in the *same* migration file as the schema changes.
- Ensure all new tables have `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` along with selective policies for read, write, update, and delete actions.

## 3. Post-Migration Steps
- At the end of the proposed migration/execution plan, always remind the user to run the TypeScript types generation command:
  `npx supabase gen types typescript --local > src/types/supabase.ts` (or the equivalent local types file path).
