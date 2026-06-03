import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";

// One-off dev utility: embed any question that doesn't have a vector yet
// (e.g. the seed rows from schema.sql). Hit GET /api/backfill once after
// running day6.sql. Not something you'd leave exposed in production.
export async function GET() {
  const { data: rows, error } = await supabase
    .from("questions")
    .select("id, body")
    .is("embedding", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const row of rows ?? []) {
    const embedding = await embed(row.body, "RETRIEVAL_DOCUMENT");
    const { error: upErr } = await supabase
      .from("questions")
      .update({ embedding })
      .eq("id", row.id);
    if (!upErr) updated++;
  }

  return Response.json({ updated, total: rows?.length ?? 0 });
}
