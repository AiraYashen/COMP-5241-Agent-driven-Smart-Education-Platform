import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

/** GET /api/lesson/curriculum?level=subjects
 *  GET /api/lesson/curriculum?level=textbooks&subjectId=5
 *  GET /api/lesson/curriculum?level=chapters&textbookId=2
 *  GET /api/lesson/curriculum?level=points&chapterId=1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const level = searchParams.get("level");
  const db = createAdminClient();

  if (level === "subjects") {
    const { data, error } = await db
      .from("lesson_subjects")
      .select("id, name")
      .order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (level === "textbooks") {
    const subjectId = searchParams.get("subjectId");
    if (!subjectId) return NextResponse.json([]);
    const { data, error } = await db
      .from("lesson_textbooks")
      .select("id, name")
      .eq("subject_id", subjectId)
      .order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (level === "chapters") {
    const textbookId = searchParams.get("textbookId");
    if (!textbookId) return NextResponse.json([]);
    const { data, error } = await db
      .from("lesson_chapters")
      .select("id, name")
      .eq("textbook_id", textbookId)
      .order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (level === "points") {
    const chapterId = searchParams.get("chapterId");
    if (!chapterId) return NextResponse.json([]);
    const { data, error } = await db
      .from("lesson_knowledge_points")
      .select("id, name, reference_text")
      .eq("chapter_id", chapterId)
      .order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "invalid level" }, { status: 400 });
}
