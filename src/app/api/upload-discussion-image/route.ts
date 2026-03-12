import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

const BUCKET = "uploads";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const userId = (session.user as any)?.id ?? "unknown";
  const ext = file.name.split(".").pop() ?? "png";
  const path = `discussion/${userId}/${Date.now()}.${ext}`;

  const db = createAdminClient();

  // Ensure bucket exists and is public
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await db.storage.createBucket(BUCKET, { public: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ publicUrl });
}
