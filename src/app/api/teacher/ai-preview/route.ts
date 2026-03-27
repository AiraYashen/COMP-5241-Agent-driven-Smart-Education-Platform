import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";
import { createLessonSession } from "@/lib/lessonSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "No content provided" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位专业的课程设计师，请根据提供的教学材料生成课程预览。
返回 JSON 格式（不要有 markdown 代码块）：
{
  "title": "简洁的课程标题（10字以内）",
  "summary": "课程概述，包含：\n1. 主要知识点\n2. 学习目标\n3. 重点难点\n4. 建议学习时间\n（总字数约200-300字）"
}`,
    },
    {
      role: "user" as const,
      content: `请根据以下内容生成课程预览：\n\n${content}`,
    },
  ];

  try {
    const text = await deepseekChat(messages);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const { title, summary } = JSON.parse(cleaned);
    const sid = createLessonSession({
      sourceText: String(content),
      knowledgePoint: String(title ?? ""),
      difficulty: "review",
    });
    const lessonUrl = `/lesson?sid=${encodeURIComponent(sid)}&q=${encodeURIComponent(String(title ?? "学习专题"))}`;
    return NextResponse.json({ title, summary, lessonUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Preview generation failed" }, { status: 500 });
  }
}
