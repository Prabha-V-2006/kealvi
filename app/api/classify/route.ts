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
