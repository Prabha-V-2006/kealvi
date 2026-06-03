"use client";

import { useState } from "react";

type Question = {
  id: string;
  text: string;
  upvotes: number;
};

export default function QuestionsList({
  initialQuestions,
  initialHasMore,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpvote(id: string) {
    // optimistic UI update
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q
      )
    );

    setLoading(id);

    try {
      await fetch("/api/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      // rollback if error
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, upvotes: q.upvotes - 1 } : q
        )
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div
          key={q.id}
          className="flex items-center justify-between rounded-xl border p-4"
        >
          <p className="text-sm">{q.text}</p>

          <button
            onClick={() => handleUpvote(q.id)}
            disabled={loading === q.id}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            👍 {q.upvotes}
          </button>
        </div>
      ))}

      {!questions.length && (
        <p className="text-sm text-gray-500">No questions yet.</p>
      )}
    </div>
  );
}