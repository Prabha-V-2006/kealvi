-- Day 6 schema additions — run this in the Supabase SQL Editor (after schema.sql).
-- Additive only: it extends the Day 5 `questions` table, it does not reset anything.
-- Each section maps to a feature in the Day 6 guide; you can run them one at a time.

-- ── Feature 2: auto-tag & moderate ───────────────────────────────────────────
-- A short topic tag the classifier fills in on submit (e.g. "deployment").
alter table questions add column if not exists topic text;

-- ── Feature 3: semantic search (pgvector) ────────────────────────────────────
-- Gemini embeddings are 768-dim. The column, the index, and the function below
-- must all agree on 768 — change one and you must change all three.
create extension if not exists vector;

alter table questions add column if not exists embedding vector(768);
create index if not exists questions_embedding_idx
  on questions using hnsw (embedding vector_cosine_ops);

-- supabase-js can't use the <=> operator directly, so wrap it in a function.
-- <=> is cosine distance; 1 - distance gives a 0..1 similarity score.
create or replace function match_questions(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (id uuid, body text, similarity float)
language sql stable as $$
  select id, body, 1 - (embedding <=> query_embedding) as similarity
  from questions
  where embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
