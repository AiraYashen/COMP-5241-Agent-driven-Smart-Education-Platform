import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位专业的出题老师，请根据教学内容生成一套互动测验题目。
返回严格的 JSON 格式（不要有 markdown 代码块）：
{
  "title": "测验标题（如：[科目]课堂练习）",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "题目内容",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "answer": "A",
      "explanation": "解析（50字以内，指出正确答案的原因）"
    }
  ]
}
要求：
- 生成 5-8 道单选题（type: "single"）
- 难度适中，覆盖教学内容的核心知识点
- answer 只填选项字母（A/B/C/D）
- explanation 简洁clear，说明为何该选项正确`,
    },
    {
      role: "user" as const,
      content: `请根据以下内容出题：\n\n${content}`,
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
