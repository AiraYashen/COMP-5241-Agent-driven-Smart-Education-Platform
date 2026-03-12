import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位专业的课程设计师，请根据提供的教学内容生成一套幻灯片大纲。
返回严格的 JSON 格式（不要有 markdown 代码块）：
{
  "title": "课程标题（10字以内）",
  "slides": [
    {
      "index": 1,
      "title": "幻灯片标题（10字以内）",
      "content": "该页核心内容（30-50字，一段话概述）",
      "bullets": ["要点1（15字以内）", "要点2", "要点3"]
    }
  ]
}
要求：生成 6-10 张幻灯片，第1张是封面/引言，最后一张是总结。bullets 每页 3-5 条。`,
    },
    {
      role: "user" as const,
      content: `请根据以下内容生成幻灯片大纲：\n\n${content}`,
    },
  ];

  try {
    const text = await deepseekChat(messages);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "生成失败" }, { status: 500 });
  }
}
