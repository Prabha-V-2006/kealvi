import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({}); // reads GEMINI_API_KEY from env

export async function POST(req: Request) {
  const { text } = await req.json();

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash-lite",
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
