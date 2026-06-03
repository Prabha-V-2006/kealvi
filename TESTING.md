# Day 6 — testing the AI features

Five features, each on its own commit (`day6-f1` … `day6-f5`). This is how to
exercise each one locally.

## One-time setup

1. **Gemini key.** Add to `.env.local` (free at https://aistudio.google.com, no card):
   ```
   GEMINI_API_KEY=AIza...your-key
   ```
   Restart the dev server after adding it — `.env.local` is read at boot.

2. **Database.** Run `supabase/day6.sql` in the Supabase SQL Editor (after `schema.sql`).
   It adds the `topic` column, the `vector` extension, the `embedding` column +
   HNSW index, and the `match_questions` function. All additive — it resets nothing.

3. **Backfill the seed rows** (so semantic search can find the 25 seeded questions):
   ```
   curl http://localhost:3000/api/backfill
   # → {"updated":25,"total":25}
   ```

4. `npm run dev`.

---

## Feature 1 — Improve with AI  (`/api/improve`, streaming)

- **UI:** type a rough question in the Ask box → click **✨ Improve** → the rewrite
  types itself in, token by token.
- **curl** (`-N` = don't buffer, so you see the stream):
  ```
  curl -N -X POST http://localhost:3000/api/improve \
    -H 'content-type: application/json' \
    -d '{"text":"how 2 ship my app to teh internet"}'
  ```
  Expect a clean rewrite streamed back as plain text.

## Feature 2 — Auto-tag & moderate  (`/api/classify`, structured output)

- **UI:** ask a normal question → it posts, gets a **topic tag** chip. Ask something
  spammy/offensive → `alert("That question was flagged.")`, no post.
- **curl:**
  ```
  curl -X POST http://localhost:3000/api/classify \
    -H 'content-type: application/json' \
    -d '{"text":"How do I deploy to Vercel?"}'
  # → {"topic":"deployment","status":"ok"}
  ```
  The response is always valid JSON matching the schema; `status` is one of
  `ok | spam | offensive`.

## Feature 3 — Semantic search  (`/api/search`, embeddings + pgvector)

- **UI:** the search box has a **Keyword (words) / Semantic (meaning)** toggle.
  The contrast is the lesson: search a phrase that shares **no words** with any
  question but means the same thing.
  - Keyword: `how do I ship my app` → finds nothing.
  - Semantic: `how do I ship my app` → surfaces *"How do I deploy to Vercel?"*
    with a similarity %.
- **curl:**
  ```
  curl -X POST http://localhost:3000/api/search \
    -H 'content-type: application/json' \
    -d '{"query":"how do I ship my app"}'
  # → {"results":[{"id":"...","body":"How do I deploy to Vercel?","similarity":0.7...}]}
  ```

## Feature 4 — Ask the room  (`/api/ask`, RAG)

- **UI:** the **Ask the room** card. Ask something the Q&A covers → grounded answer
  streams in. Ask something it doesn't → it says so (grounding in action).
- **curl:**
  ```
  curl -N -X POST http://localhost:3000/api/ask \
    -H 'content-type: application/json' \
    -d '{"question":"what should I know about deploying?"}'
  ```
  Expect a streamed answer that only references questions already asked.

## Feature 5 — MCP server  (`app/[transport]/route.ts`, the inversion)

Endpoints: `http://localhost:3000/mcp` (Streamable HTTP) and `http://localhost:3000/sse`.

- **MCP Inspector** (safest local bet — hits localhost directly):
  ```
  npx @modelcontextprotocol/inspector
  ```
  In the Inspector: Transport = **Streamable HTTP**, URL = `http://localhost:3000/mcp`,
  Connect → **List Tools** shows `list_questions` and `submit_question`.
  - Call `list_questions` → JSON of recent questions.
  - Call `submit_question` with `{ "body": "Added via MCP" }` → a row appears in the app.

> **Trust note:** `submit_question` writes to the database with no auth and no rate
> limit. That's the boundary the auth session picks up. (Also: MCP-submitted rows
> skip the F2 classify and F3 embed steps the web form runs — they won't appear in
> semantic search until backfilled.)
