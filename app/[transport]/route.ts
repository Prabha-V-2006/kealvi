import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getRecentQuestions } from "@/lib/questions";
import { supabase } from "@/lib/supabase";

// The inversion: for every other feature OUR app called the AI. Here the app
// becomes a tool an AI can call. A tool is a name, a description the AI reads to
// decide when to use it, an input shape, and a function — wired to code we
// already have. No new logic; we just exposed it to a new kind of caller.
const handler = createMcpHandler((server) => {
  server.tool(
    "list_questions",
    "Get current questions, most recent first.",
    {},
    async () => {
      const questions = await getRecentQuestions();
      return { content: [{ type: "text", text: JSON.stringify(questions) }] };
    }
  );

  server.tool(
    "submit_question",
    "Add a new question.",
    { body: z.string().describe("The question text") },
    async ({ body }) => {
      const { data } = await supabase
        .from("questions")
        .insert({ body })
        .select()
        .single();
      return { content: [{ type: "text", text: `Added: ${data.body}` }] };
    }
  );
});

export { handler as GET, handler as POST };
