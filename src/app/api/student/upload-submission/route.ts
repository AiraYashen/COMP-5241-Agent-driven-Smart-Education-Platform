import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

const BUCKET = "materials";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const assignmentId = formData.get("assignment_id") as string | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!assignmentId) return NextResponse.json({ error: "No assignment_id provided" }, { status: 400 });

  const studentId = (session.user as any)?.id ?? "unknown";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `submissions/${studentId}/${assignmentId}/${Date.now()}.${ext}`;

  const db = createAdminClient();

  // Ensure bucket exists
  const { data: buckets } = await db.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await db.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json({ error: "Failed to create bucket: " + createErr.message }, { status: 500 });
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
