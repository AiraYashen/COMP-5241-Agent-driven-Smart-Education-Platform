import { createAdminClient } from "@/lib/supabase";

export interface LessonSessionPayload {
  subject?: string;
  textbook?: string;
  chapter?: string;
  knowledgePoint?: string;
  note?: string;
  difficulty?: "preview" | "review" | "advanced";
  sourceText?: string;
}

const TTL_MS = 1000 * 60 * 30;
const TABLE = "lesson_sessions";

function normalizePayload(payload: LessonSessionPayload): LessonSessionPayload {
  return {
    subject: payload.subject?.trim() || undefined,
    textbook: payload.textbook?.trim() || undefined,
    chapter: payload.chapter?.trim() || undefined,
    knowledgePoint: payload.knowledgePoint?.trim() || undefined,
    note: payload.note?.trim() || undefined,
    difficulty: payload.difficulty ?? "review",
    sourceText: payload.sourceText?.trim() || undefined,
  };
}

export async function createLessonSession(payload: LessonSessionPayload): Promise<string> {
  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const expiresAtIso = new Date(Date.now() + TTL_MS).toISOString();
  const normalized = normalizePayload(payload);

  const { error } = await admin.from(TABLE).insert({
    id,
    payload: normalized,
    expires_at: expiresAtIso,
  });

  if (error) {
    throw new Error(`创建课程会话失败: ${error.message}`);
  }

  return id;
}

export async function getLessonSession(id: string): Promise<LessonSessionPayload | null> {
  if (!id) return null;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(TABLE)
    .select("payload, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`读取课程会话失败: ${error.message}`);
  }
  if (!data) return null;

  const expiresAtMs = Date.parse(String(data.expires_at));
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    await admin.from(TABLE).delete().eq("id", id);
    return null;
  }

  return normalizePayload((data.payload ?? {}) as LessonSessionPayload);
}
