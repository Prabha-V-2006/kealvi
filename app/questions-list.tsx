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

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter questions
  const filteredQuestions = questions.filter((q) =>
    q.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleUpvote(id: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q
      )
    );

    setLoading(id);

    try {
      await fetch("/api/upvote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
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
    <>
      {/* Search Box */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search questions..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-lg border p-2"
        />

        <button
          onClick={() => setSearchTerm(searchInput)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => (
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

        {!filteredQuestions.length && (
          <p className="text-sm text-gray-500">
            No matching questions found.
          </p>
        )}
      </div>
    </>
  );
}