import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/aliTTS";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });
  const { audioUrl } = await synthesizeSpeech(text);
  const proxied = `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}`;
  return NextResponse.json({ audioUrl: proxied });
}