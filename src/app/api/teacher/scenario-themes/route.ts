import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// GET: fetch all active themes (including built-in marker)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("scenario_themes")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: create new theme
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacherId, title, subject, subject_icon, era, role_name, narrator_name,
            difficulty, description, background, real_history, chapters_hint } = body;

    if (!teacherId || !title || !era || !role_name || !narrator_name) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("scenario_themes")
      .insert({
        teacher_id: teacherId,
        title,
        subject: subject || "历史",
        subject_icon: subject_icon || "历",
        era,
        role_name,
        narrator_name,
        difficulty: difficulty || "中级",
        description: description || "",
        background: background || "",
        real_history: real_history || "",
        chapters_hint: chapters_hint || 5,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: soft-delete a theme
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("scenario_themes")
      .update({ is_active: false })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
