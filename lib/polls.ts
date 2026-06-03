import { supabase } from "./supabase";

export async function getPolls() {
  const { data, error } = await supabase
    .from("polls")
    .select(`
      id,
      question,
      created_at,
      poll_options (
        id,
        text,
        votes
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error(error);
    return [];
  }

  return JSON.parse(JSON.stringify(data)); // 🔥 IMPORTANT FIX
}