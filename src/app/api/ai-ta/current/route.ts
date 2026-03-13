import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string | undefined;
  const role = (session.user as any).role as string | undefined;
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const db = createAdminClient();

  // Student: resolve assistants by enrolled classes.
  if (role === "STUDENT") {
    const { data: enrollments, error: enrollErr } = await db
      .from("enrollments")
      .select("class_id, classes(name)")
      .eq("student_id", userId);

    if (enrollErr) return NextResponse.json({ error: enrollErr.message }, { status: 500 });

    const classRows = enrollments ?? [];
    const classIds = classRows.map((e: any) => e.class_id).filter(Boolean);
    if (classIds.length === 0) return NextResponse.json({ assistants: [] });

    const classNameMap = new Map<string, string>();
    for (const row of classRows as any[]) {
      classNameMap.set(row.class_id, row.classes?.name ?? row.class_id);
    }

    const { data: assistants, error: taErr } = await db
      .from("ai_assistants")
      .select("id, class_id, subject, name, avatar_emoji, system_prompt, knowledge_text, created_at")
      .in("class_id", classIds)
      .order("created_at", { ascending: false });

    if (taErr) return NextResponse.json({ error: taErr.message }, { status: 500 });

    const withClass = (assistants ?? []).map((a: any) => ({
      ...a,
      class_name: classNameMap.get(a.class_id) ?? a.class_id,
    }));

    return NextResponse.json({ assistants: withClass });
  }

  // Teacher/admin: resolve assistants owned by teacher account.
  const { data: assistants, error } = await db
    .from("ai_assistants")
    .select("id, class_id, subject, name, avatar_emoji, system_prompt, knowledge_text, created_at")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assistants: assistants ?? [] });
}
