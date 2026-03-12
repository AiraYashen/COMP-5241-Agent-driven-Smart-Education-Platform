import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

const BUCKET = "materials";

const FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
  "application/msword": "WORD",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "WORD",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const teacherId = (session.user as any)?.id ?? "unknown";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${teacherId}/${Date.now()}.${ext}`;

  const db = createAdminClient();

  // Ensure bucket exists (create if missing)
  const { data: buckets } = await db.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await db.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json({ error: "Failed to create bucket: " + createErr.message }, { status: 500 });
    }
  }

  // Upload file
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

  // Insert material record into DB using admin client (bypasses RLS)
  const classId = formData.get("class_id") as string | null;
  const subject = formData.get("subject") as string | null;
  const title = formData.get("title") as string | null;
  const fileSize = parseInt((formData.get("file_size") as string) ?? "0", 10);
  const fileTypeStr = FILE_TYPES[file.type] ?? (file.type.startsWith("image/") ? "IMAGE" : "OTHER");

  if (classId && subject && title) {
    const { error: insertError } = await db.from("materials").insert({
      teacher_id: teacherId,
      class_id: classId,
      subject,
      title,
      type: fileTypeStr,
      file_url: publicUrl,
      file_size: fileSize,
    });
    if (insertError) {
      return NextResponse.json({ error: "保存课件记录失败: " + insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ publicUrl });
}
