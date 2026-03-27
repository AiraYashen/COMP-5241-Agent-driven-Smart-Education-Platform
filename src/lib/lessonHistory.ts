export type LessonDifficulty = "preview" | "review" | "advanced";

export interface LessonHistoryItem {
  id: string;
  createdAt: number;
  lessonUrl: string;
  title: string;
  subject?: string;
  chapter?: string;
  difficulty: LessonDifficulty;
}

const LESSON_HISTORY_KEY = "lesson_history_v1";
const MAX_HISTORY = 20;

export function getLessonHistory(): LessonHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LESSON_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LessonHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.lessonUrl === "string" && typeof item.title === "string")
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveLessonHistory(item: Omit<LessonHistoryItem, "id" | "createdAt">): LessonHistoryItem[] {
  if (typeof window === "undefined") return [];
  const list = getLessonHistory();
  const deduped = list.filter((entry) => entry.lessonUrl !== item.lessonUrl);
  const next: LessonHistoryItem[] = [
    {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...item,
    },
    ...deduped,
  ].slice(0, MAX_HISTORY);
  window.localStorage.setItem(LESSON_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearLessonHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LESSON_HISTORY_KEY);
}
