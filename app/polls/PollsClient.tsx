"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PollsClient() {
  const [polls, setPolls] = useState([]);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  // 🔥 LOAD POLLS (CLIENT SIDE)
  async function loadPolls() {
    const { data } = await supabase
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

    setPolls(data || []);
  }

  useEffect(() => {
    loadPolls();
  }, []);

  // 🔥 CREATE POLL
  async function createPoll() {
    const { data: poll } = await supabase
      .from("polls")
      .insert({ question })
      .select()
      .single();

    const formatted = options
      .filter((o) => o.trim() !== "")
      .map((text) => ({
        poll_id: poll.id,
        text,
        votes: 0,
      }));

    await supabase.from("poll_options").insert(formatted);

    setQuestion("");
    setOptions(["", ""]);
    setOpen(false);

    // 🔥 IMPORTANT: reload instantly
    loadPolls();
  }

  // 🔥 VOTE
  async function vote(optionId: string) {
    await supabase
      .from("poll_options")
      .update({ votes: supabase.rpc("increment", { x: 1 }) })
      .eq("id", optionId);

    loadPolls();
  }

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

      {/* CREATE MODAL */}
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
        {polls.map((poll: any) => (
          <div key={poll.id} className="border p-4 rounded">

            <h2 className="font-semibold mb-2">{poll.question}</h2>

            {poll.poll_options?.map((opt: any) => (
              <button
                key={opt.id}
                onClick={() => vote(opt.id)}
                className="w-full flex justify-between bg-gray-100 p-2 rounded mb-2"
              >
                <span>{opt.text}</span>
                <span>{opt.votes}</span>
              </button>
            ))}

          </div>
        ))}
      </div>

    </div>
  );
}