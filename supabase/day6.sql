-- Day 6 schema additions — run this in the Supabase SQL Editor (after schema.sql).
-- Additive only: it extends the Day 5 `questions` table, it does not reset anything.
-- Each section maps to a feature in the Day 6 guide; you can run them one at a time.

-- ── Feature 2: auto-tag & moderate ───────────────────────────────────────────
-- A short topic tag the classifier fills in on submit (e.g. "deployment").
alter table questions add column if not exists topic text;
