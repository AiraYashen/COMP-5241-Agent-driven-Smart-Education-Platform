import { NextRequest, NextResponse } from "next/server";
import { generateAdaptiveSegment } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { text, question, attemptNumber } = await request.json() as {
      text: string;
      question: string;
      attemptNumber?: number;
    };
    if (!text || !question) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }
    const segment = await generateAdaptiveSegment(text, question, attemptNumber ?? 1);
    return NextResponse.json(segment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
