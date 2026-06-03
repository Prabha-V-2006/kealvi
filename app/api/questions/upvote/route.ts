import { NextResponse } from "next/server";
import { upvoteQuestion } from "@/lib/voter";

export async function POST(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json(
      { error: "Missing question id" },
      { status: 400 }
    );
  }

  await upvoteQuestion(id);

  return NextResponse.json({ success: true });
}