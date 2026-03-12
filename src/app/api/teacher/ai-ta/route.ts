import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const teacherId = (session.user as any).id;
  const classId = req.nextUrl.searchParams.get("class_id");

  let query = supabase.from("ai_assistants").select("*").eq("teacher_id", teacherId);
  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assistants: data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const teacherId = (session.user as any).id;
  const body = await req.json();
  const { class_id, subject, name, avatar_emoji, system_prompt, knowledge_text } = body;

  if (!class_id || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const { data, error } = await supabase
    .from("ai_assistants")
    .insert({ teacher_id: teacherId, class_id, subject, name, avatar_emoji: avatar_emoji ?? "TA", system_prompt, knowledge_text })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assistant: data });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const teacherId = (session.user as any).id;
  const body = await req.json();
  const { id, class_id, subject, name, avatar_emoji, system_prompt, knowledge_text } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify ownership
  const { data: existing } = await supabase.from("ai_assistants").select("teacher_id").eq("id", id).single();
  if (!existing || existing.teacher_id !== teacherId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("ai_assistants")
    .update({ class_id, subject, name, avatar_emoji, system_prompt, knowledge_text })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assistant: data });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const teacherId = (session.user as any).id;
  const { id } = await req.json();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: existing } = await supabase.from("ai_assistants").select("teacher_id").eq("id", id).single();
  if (!existing || existing.teacher_id !== teacherId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("ai_assistants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
