import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { query } = await req.json();
  const queryEmbedding = await embed(query, "RETRIEVAL_QUERY");

  const { data } = await supabase.rpc("match_questions", {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 10,
  });

  return Response.json({ results: data ?? [] });
}
