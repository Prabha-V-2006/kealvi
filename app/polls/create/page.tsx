import { getPolls } from "@/lib/polls";
import PollClient from "../PollClient";
import CreatePollModal from "../CreatePollModal";

export const dynamic = "force-dynamic";

export default async function Page() {
  const polls = await getPolls();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📊 Polls</h1>

        {/* BUTTON WILL OPEN POPUP */}
        <CreatePollModal />
      </div>

      {polls.length === 0 ? (
        <p className="text-gray-500">No polls yet</p>
      ) : (
        <PollClient initialPolls={polls} />
      )}

    </main>
  );
}