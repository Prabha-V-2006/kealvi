"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function QuestionsClient({ initialQuestions }: any) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [text, setText] = useState("");
  const [visibleCount, setVisibleCount] = useState(3);
  const [expanded, setExpanded] = useState<string | null>(null);
  const maxVotes = Math.max(...questions.map((q: any) => q.votes ?? 0));
  // Search
  const [searchInput, setSearchInput] = useState("");

  // AI Search
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Ask Question
  async function askQuestion() {
    if (!text.trim()) return;

    const { data, error } = await supabase
      .from("questions")
      .insert({ text, votes: 0 })
      .select()
      .single();

    if (error || !data) {
      console.error("Insert failed:", error);
      return;
    }

    setQuestions((prev: any) => [data, ...prev]);
    setText("");
  }

  // Upvote
  async function upvote(id: string,current :number) {
  console.log("CLICKED:", id);

  // get latest DB value
  const { data, error } = await supabase
    .from("questions")
    .select("votes")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const newVotes = (data?.votes ?? 0) + 1;

  // update DB
  const { error: updateError } = await supabase
    .from("questions")
    .update({ votes: newVotes })
    .eq("id", id);

  if (updateError) {
    console.error(updateError);
    return;
  }

  
  const { data: refreshed } = await supabase
    .from("questions")
    .select("*")
    .order("votes", { ascending: false })
    .order("created_at", { ascending: false });

  setQuestions(refreshed || []);
}
  // Gemini AI Search
  async function handleAISearch() {
    if (!searchInput.trim()) return;

    setAiLoading(true);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchInput,
          questions,
        }),
      });

      const data = await res.json();

      setAiResult(data.answer);
    } catch (error) {
      console.error(error);
      setAiResult("AI search failed.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      {/* SEARCH BOX */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Ask Gemini to find relevant questions..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border p-2 flex-1 rounded"
        />

        <button
          onClick={handleAISearch}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {aiLoading ? "Searching..." : "AI Search"}
        </button>
      </div>

      {/* AI RESULT */}
      {aiResult && (
        <div className="mb-6 rounded border bg-blue-50 p-4">
          <h3 className="font-semibold mb-2">
            Gemini AI Result
          </h3>

          <p className="whitespace-pre-wrap">
            {aiResult}
          </p>
        </div>
      )}

      {/* ASK BOX */}
      <div className="mb-6 border p-4 rounded">
        <input
          className="border p-2 w-full mb-2"
          placeholder="Ask a question..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={askQuestion}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Ask
        </button>
      </div>

      {/* QUESTIONS LIST */}
      
      <div className="space-y-3">
        {questions
          .slice(0, visibleCount)
          .map((q: any) => (
            <div
              key={q.id}
              className="border p-3 rounded"
            >
              <p className="mb-2">
                {expanded === q.id
                  ? q.text
                  : q.text.length > 80
                  ? q.text.slice(0, 80) + "..."
                  : q.text}
              </p>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() =>
                    upvote(q.id, q.votes || 0)
                  }
                  className="bg-gray-200 px-2 py-1 rounded text-sm"
                >
                  👍 {q.votes || 0}
                </button>
                 {(q.votes ?? 0) === maxVotes && (
                  <span className="ml-2 bg-pink-400 text-black text-xs px-2 py-1 rounded">
                      🔥 Top Voted
                  </span>
                  )}
                {q.text.length > 80 && (
                  <button
                    onClick={() =>
                      setExpanded(
                        expanded === q.id
                          ? null
                          : q.id
                      )
                    }
                    className="text-blue-600 text-sm"
                  >
                    {expanded === q.id
                      ? "Show less"
                      : "View more"}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* VIEW MORE */}
      {visibleCount < questions.length && (
        <div className="text-center mt-4">
          <button
            onClick={() =>
              setVisibleCount((p) => p + 3)
            }
            className="bg-black text-white px-4 py-2 rounded"
          >
            View More Questions
          </button>
        </div>
      )}
    </div>
  );
}