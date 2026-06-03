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
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain" } });
}
