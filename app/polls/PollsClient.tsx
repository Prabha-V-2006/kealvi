"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ================= TYPES ================= */

type PollOption = {
  id: string;
  text: string;
  votes: number;
};

type Poll = {
  id: string;
  question: string;
  poll_options: PollOption[];
};

/* ================= COMPONENT ================= */

export default function PollsClient() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  /* ================= LOAD ================= */

  async function loadPolls() {
    const { data, error } = await supabase
      .from("polls")
      .select(`
        id,
        question,
        poll_options (
          id,
          text,
          votes
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setPolls(data || []);
  }

  useEffect(() => {
    loadPolls();
  }, []);

  /* ================= CREATE POLL ================= */

  async function createPoll() {
    if (!question.trim()) return;

    const { data: poll, error } = await supabase
      .from("polls")
      .insert({ question })
      .select()
      .single();

    if (error || !poll) {
      console.error(error);
      return;
    }

    const formattedOptions = options
      .filter((o) => o.trim() !== "")
      .map((text) => ({
        poll_id: poll.id,
        text,
        votes: 0,
      }));

    const { error: optError } = await supabase
      .from("poll_options")
      .insert(formattedOptions);

    if (optError) {
      console.error(optError);
      return;
    }

    setQuestion("");
    setOptions(["", ""]);
    setOpen(false);

    loadPolls();
  }

  /* ================= VOTE (FIXED) ================= */

  async function vote(optionId: string) {
  const { data, error } = await supabase
    .from("poll_options")
    .select("votes")
    .eq("id", optionId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const currentVotes = data?.votes ?? 0;

  const { error: updateError } = await supabase
    .from("poll_options")
    .update({ votes: currentVotes + 1 })
    .eq("id", optionId);

  if (updateError) {
    console.error(updateError);
    return;
  }

  loadPolls();
}
  /* ================= UI ================= */

  return (
    <div>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📊 Polls</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-black text-white px-3 py-2 rounded"
        >
          + Create Poll
        </button>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-5 rounded w-[400px]">

            <input
              className="border p-2 w-full mb-2"
              placeholder="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            {options.map((opt, i) => (
              <input
                key={i}
                className="border p-2 w-full mb-2"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const copy = [...options];
                  copy[i] = e.target.value;
                  setOptions(copy);
                }}
              />
            ))}

            <button
              onClick={() => setOptions([...options, ""])}
              className="text-blue-600 mb-3"
            >
              + Add option
            </button>

            <div className="flex gap-2">
              <button
                onClick={createPoll}
                className="bg-black text-white px-3 py-2 rounded flex-1"
              >
                Create
              </button>

              <button
                onClick={() => setOpen(false)}
                className="border px-3 py-2 rounded flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POLLS LIST */}
      <div className="space-y-4">
        {polls.map((poll) => {

          const maxVotes = Math.max(
            ...poll.poll_options.map((o) => o.votes ?? 0)
          );

          return (
            <div key={poll.id} className="border p-4 rounded">

              <h2 className="font-semibold mb-2">
                {poll.question}
              </h2>

              {poll.poll_options?.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => vote(opt.id)}
                  className="w-full flex justify-between bg-gray-100 p-2 rounded mb-2"
                >
                  <span>
                    {opt.text}
                    {opt.votes === maxVotes && maxVotes > 0 && (
                      <span className="ml-2 text-yellow-500 text-xs">
                        🔥 Top
                      </span>
                    )}
                  </span>

                  <span>{opt.votes}</span>
                </button>
              ))}

            </div>
          );
        })}
      </div>

    </div>
  );
}