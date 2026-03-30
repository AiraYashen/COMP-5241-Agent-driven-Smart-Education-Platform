import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

/** GET /api/teacher/knowledge-reference?pointId=123
 *  返回该知识点当前的 reference_text */
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "TEACHER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pointId = req.nextUrl.searchParams.get("pointId");
  if (!pointId) return NextResponse.json({ error: "pointId is required" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("lesson_knowledge_points")
    .select("id, name, reference_text")
    .eq("id", pointId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** PUT /api/teacher/knowledge-reference
 *  body: { pointId: number, referenceText: string }
 *  保存/覆盖参考资料 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "TEACHER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pointId, referenceText } = body ?? {};
  if (!pointId) return NextResponse.json({ error: "pointId is required" }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from("lesson_knowledge_points")
    .update({ reference_text: referenceText ?? null })
    .eq("id", pointId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
