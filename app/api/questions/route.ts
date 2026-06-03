import { supabase } from "@/lib/supabase";
import { getQuestionsPage, searchQuestions } from "@/lib/questions";
import { embed } from "@/lib/embed";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (q) {
    const questions = await searchQuestions(q, PAGE_SIZE);
    return Response.json({ questions, hasMore: false });
  }

  const offset = Number(searchParams.get("offset") ?? 0);
  const { questions, hasMore } = await getQuestionsPage(offset, PAGE_SIZE);
  return Response.json({ questions, hasMore });
}

export async function POST(req: Request) {
  const { body, author, topic } = await req.json();

  // Embed the question as it's stored, so semantic search can find it later.
  const embedding = await embed(body, "RETRIEVAL_DOCUMENT");

  const { data, error } = await supabase
    .from("questions")
    .insert({ body, author, topic, embedding })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
