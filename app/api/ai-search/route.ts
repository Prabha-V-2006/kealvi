import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { query, questions } = await req.json();

    const prompt = `
User Search:
${query}

Questions:
${questions.map((q: any) => q.text).join("\n")}

Return the most relevant questions.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return Response.json({
      answer: response.text,
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);

    return Response.json({
      answer: error?.message || "AI search failed",
    });
  }
}