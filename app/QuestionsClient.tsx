"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function QuestionsClient({ initialQuestions }: any) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [text, setText] = useState("");
  const [visibleCount, setVisibleCount] = useState(3);
  const [expanded, setExpanded] = useState<string | null>(null);

  // 🟢 ASK QUESTION
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

  // 🟢 UPVOTE
  async function upvote(id: string, currentVotes: number) {
    const { error } = await supabase
      .from("questions")
      .update({ votes: currentVotes + 1 })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    setQuestions((prev: any) =>
      prev.map((q: any) =>
        q.id === id
          ? { ...q, votes: currentVotes + 1 }
          : q
      )
    );
  }

  return (
    <div>

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
            <div key={q.id} className="border p-3 rounded">

              {/* TEXT */}
              <p className="mb-2">
                {expanded === q.id
                  ? q.text
                  : q.text.length > 80
                  ? q.text.slice(0, 80) + "..."
                  : q.text}
              </p>

              {/* ACTIONS */}
              <div className="flex gap-3 items-center">

                <button
                  onClick={() => upvote(q.id, q.votes || 0)}
                  className="bg-gray-200 px-2 py-1 rounded text-sm"
                >
                  👍 {q.votes || 0}
                </button>

                {q.text.length > 80 && (
                  <button
                    onClick={() =>
                      setExpanded(expanded === q.id ? null : q.id)
                    }
                    className="text-blue-600 text-sm"
                  >
                    {expanded === q.id ? "Show less" : "View more"}
                  </button>
                )}

              </div>
            </div>
          ))}
      </div>

      {/* VIEW MORE QUESTIONS */}
      {visibleCount < questions.length && (
        <div className="text-center mt-4">
          <button
            onClick={() => setVisibleCount((p) => p + 3)}
            className="bg-black text-white px-4 py-2 rounded"
          >
            View More Questions
          </button>
        </div>
      )}

    </div>
  );
}