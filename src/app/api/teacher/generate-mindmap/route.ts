import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";
import { getLessonSession } from "@/lib/lessonSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { content, sid, topic } = await req.json();
  const sessionPayload = typeof sid === "string" && sid ? await getLessonSession(sid) : null;
  const effectiveContent =
    (typeof content === "string" ? content : "") ||
    (typeof topic === "string" ? topic : "") ||
    sessionPayload?.sourceText ||
    sessionPayload?.knowledgePoint ||
    sessionPayload?.note ||
    "";

  if (!effectiveContent) return NextResponse.json({ error: "No content" }, { status: 400 });

  const messages = [
    {
      role: "system" as const,
      content: `你是一位专业的课程设计师，请根据教学内容生成一个 Mermaid 思维导图。
只返回合法的 Mermaid mindmap 代码（不要有任何其他文字，不要有 markdown 代码块符号）。

格式示例：
mindmap
  root((课程主题))
    概念模块A
      子知识点1
      子知识点2
    概念模块B
      子知识点3
      子知识点4

要求：
- 根节点是课程核心主题（4-8字）
- 2-4 个一级分支（大模块）  
- 每个分支 2-4 个二级节点（具体知识点）
- 节点文字简洁（8字以内）
- 只输出 mindmap 代码，无任何其余内容`,
    },
    {
      role: "user" as const,
      content: `请根据以下内容生成思维导图：\n\n${effectiveContent}`,
    },
  ];

  try {
    const text = await deepseekChat(messages);
    const code = text.replace(/```mermaid\n?/g, "").replace(/```\n?/g, "").trim();
    return NextResponse.json({ code });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "生成失败" }, { status: 500 });
  }
}
