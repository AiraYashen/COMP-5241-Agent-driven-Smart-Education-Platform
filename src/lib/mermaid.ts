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
    // fix merged adjacent edge lines, e.g. "F --> GG --> H" (from "F --> G" + "G --> H")
    .replace(/(-->\s*)([A-Za-z_][\w-]*)\2(\s*-->)/g, "$1$2\n$2$3")
    // split chained edges when a node declaration is followed by another edge start
    // e.g. "F --> G[端点] G --> H{判断}" -> two lines
    .replace(
      /(-->\s*[A-Za-z_][\w-]*(?:\[[^\]]*\]|\{[^}]*\}|\([^)]+\)|"[^"]*")?)\s+([A-Za-z_][\w-]*\s*-->)/g,
      "$1\n$2"
    )
    // normalize trailing spaces/newlines
    .trim();
}
