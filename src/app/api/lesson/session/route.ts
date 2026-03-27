import { NextRequest, NextResponse } from "next/server";
import { createLessonSession, type LessonSessionPayload } from "@/lib/lessonSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LessonSessionPayload;

  const sourceText = body.sourceText?.trim() ?? "";
  const knowledgePoint = body.knowledgePoint?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!sourceText && !knowledgePoint && !note) {
    return NextResponse.json({ error: "请至少提供知识点、备注或正文材料" }, { status: 400 });
  }

  const sid = await createLessonSession({
    subject: body.subject?.trim(),
    textbook: body.textbook?.trim(),
    chapter: body.chapter?.trim(),
    knowledgePoint,
    note,
    difficulty: body.difficulty ?? "review",
    sourceText,
  });

  const fallbackQuery =
    knowledgePoint ||
    note ||
    (sourceText ? sourceText.slice(0, 30) : "") ||
    "学习专题";

  return NextResponse.json({
    sid,
    lessonUrl: `/lesson?sid=${encodeURIComponent(sid)}&q=${encodeURIComponent(fallbackQuery)}`,
  });
}
