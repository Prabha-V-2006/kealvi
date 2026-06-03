"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CreatePollModal() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const router = useRouter();

  async function createPoll() {
    if (!question.trim()) return;

    // 1. Insert poll
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({ question })
      .select()
      .single();

    if (pollError) {
      console.error(pollError);
      return;
    }

    // 2. Insert options
    const formattedOptions = options
      .filter((opt) => opt.trim() !== "")
      .map((text) => ({
        poll_id: poll.id,
        text,
        votes: 0,
      }));

    const { error: optionError } = await supabase
      .from("poll_options")
      .insert(formattedOptions);

    if (optionError) {
      console.error(optionError);
      return;
    }

    // 3. Reset UI
    setOpen(false);
    setQuestion("");
    setOptions(["", ""]);

   setTimeout(() => {
  router.refresh();
}, 10);
  }

  return (
    <>
      {/* BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white px-3 py-2 rounded"
      >
        + Create Poll
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded w-[400px]">

            <h2 className="text-lg font-bold mb-3">
              Create Poll
            </h2>

            {/* QUESTION */}
            <input
              className="border p-2 w-full mb-2"
              placeholder="Poll question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            {/* OPTIONS */}
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

            {/* ADD OPTION */}
            <button
              onClick={() => setOptions([...options, ""])}
              className="text-blue-600 mb-3"
            >
              + Add option
            </button>

            {/* ACTION BUTTONS */}
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
    </>
  );
}