import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

// Turn text into a 768-dim vector — the model's "understanding" of the text,
// frozen into numbers. Similar meanings land near each other in this space.
// taskType matters: embed stored questions as DOCUMENT, the search query as
// QUERY — the model tunes each side slightly differently.
export async function embed(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
) {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768, taskType },
  });
  return result.embeddings![0].values;
}
