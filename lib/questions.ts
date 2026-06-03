import { supabase } from "./supabase";

export async function getQuestionsPage() {
  const { data, error } = await supabase
    .from("questions")
    .select("id, text, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return { questions: [], hasMore: false };
  }

  return {
    questions: data || [],
    hasMore: false,
  };
}