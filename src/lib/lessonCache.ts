export function readLessonCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const sessionRaw = window.sessionStorage.getItem(key);
    if (sessionRaw) return JSON.parse(sessionRaw) as T;
  } catch {
    // ignore parse/storage errors
  }
  try {
    const localRaw = window.localStorage.getItem(key);
    if (localRaw) return JSON.parse(localRaw) as T;
  } catch {
    // ignore parse/storage errors
  }
  return null;
}

export function writeLessonCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(value);
  try {
    window.sessionStorage.setItem(key, serialized);
  } catch {
    // ignore storage errors
  }
  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    // ignore storage errors
  }
}
