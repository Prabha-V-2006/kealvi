import { supabase } from "./supabase";

export async function getQuestionsPage() {
  const { data, error } = await supabase
    .from("questions")
    .select("id, text,votes, created_at")
    .order("votes", { ascending: false })
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
export async function searchQuestions(
  q: string,
  pageSize: number
) {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .ilike("title", `%${q}%`)
    .limit(pageSize);

  if (error) throw error;

  return data;
}