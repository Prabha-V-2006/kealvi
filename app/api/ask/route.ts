import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  const { question } = await req.json();

  // 1. RETRIEVE — the most relevant existing questions (F3, reused)
  const queryEmbedding = await embed(question, "RETRIEVAL_QUERY");
  const { data: matches } = await supabase.rpc("match_questions", {
    query_embedding: queryEmbedding,
    match_threshold: 0.4,
    match_count: 5,
  });

  // 2. AUGMENT — build context from what we retrieved
  const context = (matches ?? []).map((m: any) => `- ${m.body}`).join("\n");

  // 3. GENERATE — answer grounded ONLY in that context (F1, reused)
  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: `Questions already asked in this Q&A:\n${context}\n\nUser asks: ${question}\n\nAnswer using only the questions above. If they don't cover it, say so.`,
  });

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain" } }
  );
}
