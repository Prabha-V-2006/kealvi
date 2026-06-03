"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PollClient({ initialPolls }: any) {
  const [polls, setPolls] = useState(initialPolls);

  async function vote(optionId: string) {
    setPolls((prev: any) =>
      prev.map((poll: any) => ({
        ...poll,
        poll_options: poll.poll_options.map((opt: any) =>
          opt.id === optionId
            ? { ...opt, votes: opt.votes + 1 }
            : opt
        ),
      }))
    );

    await supabase
      .from("poll_options")
      .update({ votes: supabase.rpc("increment", { x: 1 }) })
      .eq("id", optionId);
  }

  return (
    <div className="space-y-6">
      {polls.map((poll: any) => (
        <div key={poll.id} className="border p-4 rounded-xl">
          <h2 className="font-semibold mb-3">{poll.question}</h2>

          <div className="space-y-2">
            {poll.poll_options.map((opt: any) => (
              <button
                key={opt.id}
                onClick={() => vote(opt.id)}
                className="w-full flex justify-between bg-gray-100 p-2 rounded"
              >
                <span>{opt.text}</span>
                <span>{opt.votes}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}