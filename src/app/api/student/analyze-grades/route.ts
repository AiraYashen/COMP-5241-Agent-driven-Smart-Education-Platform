import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const { grades, studentName } = await req.json();
  if (!grades) return NextResponse.json({ error: "No grades provided" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位耐心的AI辅导老师，专门帮助学生分析成绩薄弱点并给出个性化学习建议。
请返回 JSON 格式（不要有 markdown 代码块）：
{
  "analysis": "对学生成绩的综合分析，要温和鼓励，指出薄弱科目和可能的原因（约100字）",
  "suggestions": ["学习建议1（具体可操作）", "学习建议2", "学习建议3"],
  "practice": "具体的练习建议，包括推荐的题型和练习方式（约50字）"
}`,
    },
    {
      role: "user" as const,
      content: `${studentName ? `学生: ${studentName}\n` : ""}各科成绩如下（科目: 分数）：\n${grades}\n\n请分析薄弱点并给出学习建议。`,
    },
  ];

  try {
    const text = await deepseekChat(messages);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Analysis failed" }, { status: 500 });
  }
}
