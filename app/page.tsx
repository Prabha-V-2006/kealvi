import QuestionsClient from "./QuestionsClient";
import { getQuestionsPage } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { questions } = await getQuestionsPage();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold mb-6">💬 Live Q&A</h1>

      <QuestionsClient initialQuestions={questions} />
    </main>
  );
}