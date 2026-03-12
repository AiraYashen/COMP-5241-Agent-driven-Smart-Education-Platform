import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const { imageBase64, assignmentTitle } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位专业教师助手，负责批改学生作业。请根据提供的作业图片进行评分。
返回 JSON 格式（不要有 markdown 代码块）：
{
  "score": 数字(0-100),
  "total": 100,
  "comments": "总体评语字符串",
  "details": [{"point": "知识点", "correct": true/false, "comment": "具体说明"}]
}`,
    },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: `请批改这份作业${assignmentTitle ? `（${assignmentTitle}）` : ""}，给出评分和详细评语。` },
        { type: "image_url" as const, image_url: { url: imageBase64 } },
      ],
    },
  ];

  try {
    const text = await deepseekChat(messages as any);
    // Clean potential markdown code fences
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "AI grading failed" }, { status: 500 });
  }
}
