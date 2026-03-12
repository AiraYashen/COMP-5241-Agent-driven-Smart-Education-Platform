import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const { points } = await req.json();
  if (!points) return NextResponse.json({ error: "No points provided" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位经验丰富的教师，负责分析学生的错题知识点并给出针对性的教学建议。
请返回 JSON 格式（不要有 markdown 代码块）：
{
  "analysis": "对这批知识点错误的综合分析，指出根本原因",
  "suggestions": ["教学建议1", "教学建议2", "教学建议3"],
  "practice": "推荐的练习方向或题目类型描述"
}`,
    },
    {
      role: "user" as const,
      content: `以下是班级学生的易错知识点（每行格式为"知识点: 错误次数"）：\n${points}\n\n请分析错误原因并给出教学建议。`,
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
