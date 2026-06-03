# Day 6 — AI in your app (teach-from guide)

**Planning outline.** Same shape as the Day 5 guide — feature slices, delivery
tags, talk track. Every backend snippet here is the exact code on the branch,
tested live against Gemini + Supabase.

We extend the Day 5 Slido app with five AI integrations. The arc: the first four
are a **climb in sophistication** — AI as a dumb text box up to AI reasoning over
your own data — and the fifth is the **inversion**, where the AI calls your app.

```
1 Improve      AI as a text transformer      "text in, text out"
2 Structured   AI as a typed function        "returns data my code acts on"
3 Semantic     AI that understands meaning   "matches meaning, not words"
4 RAG          AI grounded in your data      "answers from what you have"
            ──────────── the inversion ────────────
5 MCP          your app as a tool an AI calls "now the AI calls you"
```

**Built UI-first, like Day 5.** For each feature we put the **visible control on
screen first** — the button, the box, the result area — and wire it to a route
that *doesn't exist yet*. Students click it, see it do nothing (a 404 in the
network tab), and *that's* the cue to go build the backend. They see and feel the
feature before they learn how it works. (Feature 5 is the one exception — and why
is a lesson in itself.)

**The frame to say out loud:** "Most people think AI is a chatbot. Today we take
that apart. Same app, same database — we make the AI progressively smarter about
*our* data, then flip the whole thing around. And like always, we build what you
can see first."

**Provider: Google Gemini, free tier.** No card, doesn't expire, multimodal, does
embeddings — so generation (F1, F2, F4) and embeddings (F3, F4) all run on **one
free key**.

**The thread under all of it: trust boundaries.** Every feature crosses one — a
secret key, AI moderating user content, AI writing to your database. Callbacks to
Day 5's "secrets stay on the server" and the scale-talk's identity/abuse points
land here, and it's the on-ramp to Day 7 (auth).

**Builds on:** the Day 5 app — `lib/questions.ts`, `app/questions-list.tsx`, the
API routes, Supabase.

**Verified stack (the day this was built):** Next.js **16.2.6**, `@google/genai`
**2.7.0**, `mcp-handler` **1.1.0**, `@modelcontextprotocol/sdk` **1.26.0**, `zod`
**4.4.3**. Models **`gemini-2.5-flash`** + **`gemini-embedding-001`** (768-dim).
All confirmed working — but model strings drift, so re-check at ai.google.dev.
**Checkpoints are git tags `ai-feat-1`…`ai-feat-5`** (`git cherry-pick ai-feat-3`).

---

## Session map (~90 min if you build all five — you won't always)

| # | You build | New concept | Tier | Time |
|---|---|---|---|---|
| 1 | "Improve with AI" button | LLM call, server secret, **streaming** | Core | ~25 min |
| 2 | Topic tags + moderation on submit | **structured output** (typed JSON) | Bonus | ~15 min |
| 3 | Semantic search box | **embeddings + pgvector** | Core | ~20 min |
| 4 | "Ask the room" box | **RAG** (retrieve→augment→generate) | Strong | ~12 min |
| 5 | Expose app as an MCP server | the inversion: app as a tool | Strong | ~18 min |

### The cut ladder (you flag these live)

Five is more than a tight slot holds, by design. Drop in this order if behind:
1. **Compress Feature 2** to a 3-min "here's the JSON it returns, here's why" —
   most standalone rung.
2. **Feature 5 (MCP) → "next session."** Clean standalone on a different axis.
3. **Floor on Feature 1:** behind early? ship non-streaming, move on.
4. **Protect:** F1 (at least non-streaming) and **F3** (the semantic-search Day-5
   callback is the best beat). F4 is cheap *once F3 exists*, so land it if you built F3.

**Gates:** clock-check after F1 (behind? compress F2) and after F3 (spine +
callback done; spend the rest on F4, then F5).

---

## One-time setup (do before class)

**`[PASTE]`** — `npm install @google/genai`, then add to `.env.local`:

```
GEMINI_API_KEY=AIza...key_from_aistudio.google.com
```

Restart `npm run dev` after adding it — `.env.local` is read at boot (Day 5 gotcha).

---

# Feature 1 — Improve with AI (~25 min)  · *AI as a text transformer*

**Story beat:** smallest new idea, on purpose. An "Improve" button next to the
draft is another `fetch` — except it calls an LLM, not the database. "You already
know how to do this. The only new part is who we're calling."

## Build the UI first

**`[PASTE]`** — the button, between the input and "Ask" in `questions-list.tsx`:

```tsx
<button
  onClick={improve}
  disabled={improving || !draft.trim()}
  title="Rewrite this question to be clearer with AI"
  className="rounded-xl border px-4 py-2.5 text-sm font-medium text-brand transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-50"
>
  {improving ? "Improving…" : "✨ Improve"}
</button>
```

**`[TYPE]`** — the handler + its state. Notice it reads a *stream* and pours it
into the draft box. Write this now, before the route exists.

```tsx
const [improving, setImproving] = useState(false);

async function improve() {
  if (!draft.trim() || improving) return;
  setImproving(true);
  try {
    const res = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    setDraft("");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setDraft((d) => d + decoder.decode(value));
    }
  } finally {
    setImproving(false);
  }
}
```

Click it. **Nothing useful happens — a 404 in the network tab**, because
`/api/improve` doesn't exist yet.

> "The button's here, it's wired up, it expects an answer to stream back into the
> box — and there's nothing behind it. That 404 is our to-do list. Let's build the
> room behind the door."

## Now build the route behind it

**Security beat — the Day 5 callback:**

> "Same rule as the database key. It's a credential — server only, never the
> browser. Every AI call goes browser → our route → Gemini → back."

**`[TYPE]`** — `app/api/improve/route.ts`:

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({}); // reads GEMINI_API_KEY from env

export async function POST(req: Request) {
  const { text } = await req.json();

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: text,
    config: {
      systemInstruction:
        "Rewrite the user's question to be clearer and more concise. Return only the rewritten question.",
    },
  });

  const encoder = new TextEncoder();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (!chunk.text) continue;
        // Gemini sends a few big chunks; re-emit char by char with a small
        // delay so the rewrite visibly types out. The await also forces each
        // piece to flush instead of coalescing into one write.
        for (const char of chunk.text) {
          controller.enqueue(encoder.encode(char));
          await sleep(12);
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform", // stop proxies buffering the stream
      "X-Accel-Buffering": "no",
    },
  });
}
```

Click Improve again. The rewrite **types itself into the box**, character by
character.

> "Now the door opens. And notice it *types* — because we stream. The function
> stays open the whole time the model talks; that's the workload that needs the
> long-running functions we talked about with Vercel."

**What you'll see:** `how 2 ship my app to teh internet??` → *"How do I deploy my
application online?"*, arriving as ~38 small chunks over ~half a second.

> **Why the re-chunking?** Gemini decides its own chunk sizes, and a short
> rewrite comes back in **one or two big chunks** — so without pacing it just
> *appears* all at once and there's nothing to watch type. We re-emit it char by
> char to *make the stream visible*. Be honest about this in class: it's pacing
> for the demo, not something Gemini does for you. On genuinely long generations
> (the F4 RAG answer) you'd see real streaming with no trick. If a rewrite ever
> lands as an empty box, it's almost always a **free-tier 429** — the route throws,
> returns 500 with an empty body, and your reader gets zero chunks. Pace your
> clicks (~20 requests/min, shared across improve + classify + embed).

*(Floor version: build the route with `generateContent` returning
`Response.json({ improved: response.text })` and have the handler `await
res.json()`. Land the integration first; upgrade to streaming if time allows —
the laggy→typing contrast is the streaming lesson.)*

`CHECKPOINT — tag ai-feat-1`. **Gate:** behind? Compress Feature 2.

---

# Feature 2 — Topic tags & moderation (~15 min)  · *AI as a typed function*

**Story beat:** the jump from "chatbot" to "component in a pipeline." The model
returns **JSON your code branches on** — a topic for each question and a
moderation verdict. "The model isn't talking to a human now. It's returning data
to *my code*."

## Build the UI first

**`[PASTE]`** — a topic chip on each question card (blank until the backend fills
it). In the `<li>`, under the question body:

```tsx
{q.topic && (
  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
    {q.topic}
  </span>
)}
```

(Add `topic: string | null` to the `Question` type so this compiles.)

**`[TYPE]`** — gate the existing `submit` so it asks a (not-yet-built) route to
classify first:

```tsx
async function submit() {
  if (!draft.trim()) return;

  // Classify first: typed JSON our code branches on — block anything not "ok",
  // keep the topic tag for storage + display.
  const verdict = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: draft }),
  }).then((r) => r.json());

  if (verdict.status !== "ok") {
    alert("That question was flagged.");
    return;
  }

  const res = await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: draft, topic: verdict.topic }),
  });
  const created = await res.json();

  setQuestions((qs) => [{ ...created, votes: 0 }, ...qs]);
  setDraft("");
}
```

Submit something. **It breaks** — `/api/classify` 404s, so `verdict` is junk.

> "We've decided what the UI does: every question gets a topic tag, and anything
> flagged gets blocked before it posts. The submit flow already expects a verdict.
> Now we build the thing that produces one — and the interesting part is that it
> has to return *structured data*, not a sentence."

## Now build the route behind it

**`[PASTE]`** — add the column (the F2 section of `supabase/day6.sql`):

```sql
alter table questions add column if not exists topic text;
```

**`[TYPE]`** — `app/api/classify/route.ts`. The new idea is the schema.

```ts
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  const { text } = await req.json();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: text,
    config: {
      systemInstruction:
        "Classify this Q&A question. Give a short topic tag and a moderation status.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "one or two words, e.g. deployment, databases",
          },
          status: { type: Type.STRING, enum: ["ok", "spam", "offensive"] },
        },
        required: ["topic", "status"],
      },
    },
  });

  return Response.json(JSON.parse(response.text!)); // { topic, status }
}
```

Thread `topic` through the existing code: accept it in `POST /api/questions`
(`const { body, author, topic } = await req.json()` → `insert({ body, author,
topic })`) and add `topic` to the `.select(...)` and mapped rows in
`lib/questions.ts`.

Submit a normal question (tag appears) and something spammy (blocked).

> "`responseSchema` forces the answer into *this exact shape* — `response.text`
> is guaranteed valid JSON. `enum` means status can only be three values. We
> branch on it: block spam, show the topic. The AI made a decision our app acts
> on, automatically."

**What you'll see:** `{"topic":"deployment","status":"ok"}`; "deploy vercel?"
posts with a *Deployment* tag.

**Trust beat:** AI is now moderating user content — a real safety boundary, and
imperfect (you'd log and allow appeals, not trust it blindly).

`CHECKPOINT — tag ai-feat-2`. *(Cut option: skip the wiring, just show the JSON
and explain — 3 min.)*

---

# Feature 3 — Semantic search (~20 min)  · *AI that understands meaning*  ·  **the Day 5 callback**

**Story beat:** the best beat of the day. Day 5's search matched **words**
(inverted index). Now we match **meaning**: each question becomes a vector, and we
find the closest ones. "Search 'how do I ship my app' and it finds 'deploying to
Vercel' — no shared words, same meaning."

> **Note vs the committed code:** `ai-feat-3` shipped this as a **keyword/semantic
> toggle on the single search box**. This guide teaches the **two-boxes-side-by-side**
> variant below, because seeing both result sets at once is the stronger live
> contrast. Pick whichever you prefer to demo — say the word and I'll reconcile the
> branch to match.

## Build the UI first

**`[PASTE]`** — a second search box (next to Day 5's keyword one) and a results
area, so the contrast is visible:

```tsx
const [semQuery, setSemQuery] = useState("");
const [semResults, setSemResults] = useState<
  { id: string; body: string; similarity: number }[]
>([]);
```

```tsx
<input
  value={semQuery}
  onChange={(e) => setSemQuery(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && semanticSearch()}
  placeholder="Search by meaning…"
  className="w-full rounded-xl border bg-surface px-4 py-2.5 text-sm focus:border-brand"
/>
<ul className="space-y-2">
  {semResults.map((r) => (
    <li key={r.id} className="flex items-start gap-3 rounded-2xl border bg-surface p-4">
      <span className="rounded-xl border border-brand bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">
        {(r.similarity * 100).toFixed(0)}%
      </span>
      <p className="flex-1 leading-snug">{r.body}</p>
    </li>
  ))}
</ul>
```

**`[TYPE]`** — the handler, calling a route we'll build:

```tsx
async function semanticSearch() {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: semQuery }),
  });
  const { results } = await res.json();
  setSemResults(results);
}
```

Type and search — **empty, the route 404s.**

> "Two search boxes now: yesterday's keyword one, and this one. Identical-looking,
> completely different engine behind it. The box is ready; let's build the
> meaning-matching behind it."

## Now build the route behind it

**`[PASTE]`** — the vector setup, run live in SQL (the F3 section of
`supabase/day6.sql`). Gemini embeddings are 768-dim.

```sql
create extension if not exists vector;
alter table questions add column if not exists embedding vector(768);
create index if not exists questions_embedding_idx
  on questions using hnsw (embedding vector_cosine_ops);

create or replace function match_questions(
  query_embedding vector(768), match_threshold float, match_count int
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
```

> "`vector(768)` — 768 numbers per question. `<=>` is cosine distance: small =
> similar meaning. We wrap it in a function because the JS client can't speak that
> operator directly."

**`[PASTE]`** — `lib/embed.ts`:

```ts
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});

export async function embed(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
) {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768, taskType },
  });
  return result.embeddings![0].values; // confirmed accessor in @google/genai 2.7.0
}
```

> "An embedding is the model's understanding of text frozen into 768 numbers.
> Similar meanings land near each other. Embed stored questions as DOCUMENT, the
> search query as QUERY — the model tunes each side slightly."

**`[FILL]`** — embed on submit, in `POST /api/questions`:

```ts
import { embed } from "@/lib/embed";
// before the insert:
const embedding = await embed(body, "RETRIEVAL_DOCUMENT");
// ...insert({ body, author, topic, embedding })
```

**`[TYPE]`** — the search route, `app/api/search/route.ts`:

```ts
import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { query } = await req.json();
  const queryEmbedding = await embed(query, "RETRIEVAL_QUERY");
  const { data } = await supabase.rpc("match_questions", {
    query_embedding: queryEmbedding, match_threshold: 0.5, match_count: 10,
  });
  return Response.json({ results: data ?? [] });
}
```

**`[PASTE]`** — backfill the seeds once (they have no embedding yet) —
`app/api/backfill/route.ts`, then hit `GET /api/backfill`:

```ts
import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: rows, error } = await supabase
    .from("questions").select("id, body").is("embedding", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const row of rows ?? []) {
    const embedding = await embed(row.body, "RETRIEVAL_DOCUMENT");
    const { error: upErr } = await supabase
      .from("questions").update({ embedding }).eq("id", row.id);
    if (!upErr) updated++;
  }
  return Response.json({ updated, total: rows?.length ?? 0 });
}
```

**Demo — the contrast is the lesson.** Search a phrase that shares *no words* with
any question but means the same. Keyword box: nothing. Semantic box: nails it.

> "Same data, two ways to search it — words versus meaning. This is how 'related
> products' and 'similar questions' actually work."

**What you'll see:** keyword `ship my app` → nothing; semantic `how do I ship my
app` → **"How do I deploy to Vercel?"** at **67%**.

`CHECKPOINT — tag ai-feat-3`. **Gate:** spine + callback done. Spend the rest on
F4, then F5.

---

# Feature 4 — Ask the room (~12 min)  · *AI grounded in your data*  ·  **RAG**

**Story beat:** the capstone, cheap because it reuses everything. RAG =
**R**etrieve relevant questions (F3), **A**ugment a prompt with them, **G**enerate
a grounded answer (F1's streaming). "We don't ask the AI what it knows — we ask it
about *our* Q&A."

## Build the UI first

**`[PASTE]`** — an "Ask the room" card with an answer area:

```tsx
const [askQuestion, setAskQuestion] = useState("");
const [answer, setAnswer] = useState("");
const [asking, setAsking] = useState(false);
```

```tsx
<div className="rounded-2xl border bg-surface p-4 shadow-sm">
  <div className="flex gap-2">
    <input
      value={askQuestion}
      onChange={(e) => setAskQuestion(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && ask()}
      placeholder="Ask the room — answered from what's been asked…"
      className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm"
    />
    <button
      onClick={ask}
      disabled={asking || !askQuestion.trim()}
      className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
    >
      {asking ? "Thinking…" : "Ask the room"}
    </button>
  </div>
  {answer && (
    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-brand-soft/50 p-3 text-sm leading-relaxed">
      {answer}
    </p>
  )}
</div>
```

**`[TYPE]`** — the handler (same stream-reading shape as F1, into `answer`):

```tsx
async function ask() {
  if (!askQuestion.trim() || asking) return;
  setAsking(true);
  setAnswer("");
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: askQuestion }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setAnswer((a) => a + decoder.decode(value));
    }
  } finally {
    setAsking(false);
  }
}
```

Ask something — **404, no route yet.**

> "Reads just like the Improve button — stream an answer into a box. The
> difference is entirely behind the door: this answer will be grounded in our own
> questions. Let's build that."

## Now build the route behind it

**`[TYPE]`** — `app/api/ask/route.ts`. Call out the three RAG steps as you write them.

```ts
import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  const { question } = await req.json();

  // 1. RETRIEVE — most relevant existing questions (F3, reused)
  const queryEmbedding = await embed(question, "RETRIEVAL_QUERY");
  const { data: matches } = await supabase.rpc("match_questions", {
    query_embedding: queryEmbedding, match_threshold: 0.4, match_count: 5,
  });

  // 2. AUGMENT — build context from what we retrieved
  const context = (matches ?? []).map((m: any) => `- ${m.body}`).join("\n");

  // 3. GENERATE — answer grounded ONLY in that context (F1, reused)
  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: `Questions already asked in this Q&A:\n${context}\n\nUser asks: ${question}\n\nAnswer using only the questions above. If they don't cover it, say so.`,
  });

  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
      controller.close();
    },
  }), { headers: { "Content-Type": "text/plain" } });
}
```

> "That's RAG demystified — retrieve, augment, generate. The only new line is
> stuffing retrieved questions into the prompt. And 'answer using only the above,
> else say so' is how you fight hallucination: ground the model in real data."

Demo: ask something the Q&A covers (grounded answer), then something it doesn't
(it admits it). The second demo is the gold.

`CHECKPOINT — tag ai-feat-4`.

---

# Feature 5 — Expose your app as an MCP server (~18 min)  · *the inversion*

**Story beat:** flip the whole day. For four features your app *called* the AI.
Now your app *becomes a tool an AI calls*.

**Why there's no UI to build first here — and that's the point:**

> "Every other feature today, we built the UI first — a button, a box, a result.
> This one has *no UI at all*. Why? Because the client isn't a person looking at a
> screen. It's an AI. That's the whole inversion: we're not building a face for a
> human, we're building a door for a machine. The 'frontend' for this feature is
> someone else's AI assistant."

*(No LLM-provider code — this exposes your own functions. Identical whatever you
used for F1–F4.)*

**`[PASTE]`** — `npm install mcp-handler @modelcontextprotocol/sdk zod`.
(Classroom: HTTP transport is fine; SSE wants Redis via `REDIS_URL`, Fluid
compute, raised `maxDuration` on Pro.)

**`[FILL]`** — add `getRecentQuestions` to `lib/questions.ts` (the tool needs it):

```ts
export async function getRecentQuestions(limit = 20) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, topic, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

**`[TYPE]`** — `app/[transport]/route.ts`. Two tools, wired to functions that
already exist.

```ts
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getRecentQuestions } from "@/lib/questions";
import { supabase } from "@/lib/supabase";

const handler = createMcpHandler((server) => {
  server.tool("list_questions", "Get current questions, most recent first.", {}, async () => {
    const questions = await getRecentQuestions();
    return { content: [{ type: "text", text: JSON.stringify(questions) }] };
  });

  server.tool("submit_question", "Add a new question.",
    { body: z.string().describe("The question text") },
    async ({ body }) => {
      const { data } = await supabase.from("questions").insert({ body }).select().single();
      return { content: [{ type: "text", text: `Added: ${data.body}` }] };
    });
});

export { handler as GET, handler as POST };
```

> "A tool is a name, a description the AI reads to decide when to use it, an input
> shape, and a function. `list_questions` calls the exact function our page uses.
> `submit_question` does the exact insert our form does. New logic? None. We
> exposed what we had to a new kind of caller."

**Endpoints:** `http://localhost:3000/mcp` (Streamable HTTP) and `/sse`.

**Demo:** point the MCP Inspector (`npx @modelcontextprotocol/inspector`,
Transport = Streamable HTTP, URL = `http://localhost:3000/mcp`) at your URL.
"What are people asking?" → it calls `list_questions`. "Add a question about
deployment" → a row appears in your app. *Or* prove it in one curl:

```bash
curl -s -X POST http://localhost:3000/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"submit_question","arguments":{"body":"Added by an AI via MCP"}}}'
# → data: {"result":{"content":[{"type":"text","text":"Added: Added by an AI via MCP"}]},...}
```

**The trust beat — climax of the day's thread, do not skip:**

> "Look at `submit_question`. We gave an AI the ability to *write to our database*.
> What stops it adding a thousand rows of garbage? Right now, nothing. Same
> boundary we crossed when AI moderated content in Feature 2, and when we hid the
> key in Feature 1 — now with an AI taking *actions*. Real MCP servers gate write
> tools behind auth, rate-limit them, sometimes require a human to confirm.
> Exposing capability to an AI is where 'who's allowed to do this' stops being
> theoretical."

> *Honest aside:* this `submit_question` inserts only `body` — it skips the F2
> classify and F3 embed the web form runs, so MCP-added rows won't show in
> semantic search. A nice illustration that "expose what we have" still means
> deciding *which* path you expose.

That's the hand-off to Day 7. `CHECKPOINT — tag ai-feat-5`.

---

## Closing — the shape of the day

> "Five features, one journey. AI as a text box — clumsy question in, clean
> question out. Then returning *data* our code acts on. Then understanding
> *meaning*, searching by what things mean. Then *grounded* in our own Q&A,
> answering from real data instead of making things up. Then flipped — our app
> became a tool an AI could call. Same `fetch`-a-service-you-don't-own plumbing
> throughout, and every time, we built what you could see before we built what you
> couldn't — except the last one, where there was nothing to see, because the user
> was a machine. And every rung crossed a trust boundary — which is exactly what
> tomorrow is about."

| # | Rung | Direction | Trust boundary |
|---|---|---|---|
| 1 | text transformer | app → AI | API key is a secret |
| 2 | typed function | app → AI | AI moderates user content |
| 3 | meaning (vectors) | app → AI | user text sent to a third party |
| 4 | grounded (RAG) | app → AI | what data you feed the model |
| 5 | inversion (MCP) | AI → app | a write action exposed to an AI |

---

## Prep & risk notes

- **One key:** `GEMINI_API_KEY` in `.env.local`; restart the dev server after
  adding it. Free at aistudio.google.com, no card. Students make their own ahead
  of time; demo on yours.
- **Run `supabase/day6.sql` section by section** as you reach F2 (topic) and F3
  (vector). Additive — resets nothing. Then **`GET /api/backfill`** once, or
  semantic search finds nothing.
- **Model strings drift — verify the morning of** at ai.google.dev.
  `gemini-2.5-flash` and `gemini-embedding-001` (768-dim) confirmed working. Use
  Flash, not Pro.
- **Embeddings accessor** confirmed as `result.embeddings![0].values` in
  `@google/genai` 2.7.0; `console.log` once if you bump the SDK.
- **Dimension must match everywhere:** `outputDimensionality: 768` ↔ `vector(768)`
  ↔ `match_questions(... vector(768) ...)`.
- **`taskType` matters:** documents as `RETRIEVAL_DOCUMENT`, the query as
  `RETRIEVAL_QUERY`. Mixing them silently degrades results.
- **Free-tier limits are real** (~10–100 RPM by model/task) and inputs may train
  Google's models — say this before sending user content. Show a `429` once.
- **MCP demo** needs a public HTTPS URL for hosted assistants (`ngrok http 3000`);
  the MCP Inspector hits localhost directly and is the safer live bet.
- **UI-first note:** each feature's button/box will 404 until its route exists —
  that's intended as the motivator, not a bug. Tell students the 404 is the to-do
  list.
- **Checkpoints are git tags** `ai-feat-1`…`ai-feat-5`; replay onto a clean branch
  in order with `git cherry-pick ai-feat-N` (order matters — F3 edits F2's route).
- **Cut ladder:** compress F2 first, then MCP → next session, protect F1 + F3,
  land F4 if you built F3.
```
