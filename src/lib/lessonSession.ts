export interface LessonSessionPayload {
  subject?: string;
  textbook?: string;
  chapter?: string;
  knowledgePoint?: string;
  note?: string;
  difficulty?: "preview" | "review" | "advanced";
  sourceText?: string;
}

interface LessonSessionRecord {
  payload: LessonSessionPayload;
  expiresAt: number;
}

const TTL_MS = 1000 * 60 * 30;
const sessions = new Map<string, LessonSessionRecord>();

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, rec] of sessions.entries()) {
    if (rec.expiresAt <= now) sessions.delete(id);
  }
}

export function createLessonSession(payload: LessonSessionPayload): string {
  cleanupExpiredSessions();
  const id = crypto.randomUUID();
  sessions.set(id, {
    payload,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

export function getLessonSession(id: string): LessonSessionPayload | null {
  cleanupExpiredSessions();
  const rec = sessions.get(id);
  if (!rec) return null;
  return rec.payload;
}
