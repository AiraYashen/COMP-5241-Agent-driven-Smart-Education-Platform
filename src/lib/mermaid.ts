export function normalizeMermaidCode(input: string): string {
  if (!input) return "";

  return input
    // remove markdown fences if model still returns them
    .replace(/```mermaid\s*/gi, "")
    .replace(/```\s*/g, "")
    // support escaped newlines
    .replace(/\\n/g, "\n")
    // fix common "statement glued together" issue, e.g. "...}B --> ..." or "...}B -- text --> ..."
    .replace(/([)\]}"])\s*([A-Za-z_][\w-]*)\s*(-->|--)/g, "$1\n$2 $3")
    // normalize trailing spaces/newlines
    .trim();
}
