import { supabase } from "./supabase";

// increases upvote count in DB
export async function upvoteQuestion(id: string) {
  const { data, error } = await supabase
    .from("questions")
    .select("upvotes")
    .eq("id", id)
    .single();

  if (error) throw error;

  const newCount = (data?.upvotes ?? 0) + 1;

  const { error: updateError } = await supabase
    .from("questions")
    .update({ upvotes: newCount })
    .eq("id", id);

  if (updateError) throw updateError;
}