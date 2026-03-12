import { NextRequest } from "next/server";
import { streamAnswer, streamAnswerWithHistory } from "@/lib/deepseek";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_SYSTEM =
  "你是一位耐心的AI辅导老师，擅长帮学生解题和答疑。请用通俗易懂的语言详细解答，多用比喻和步骤说明。";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      userQuestion?: string;
      question?: string;
      context?: string;
      imageBase64?: string;
      systemPrompt?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    const question = body.userQuestion ?? body.question ?? "";
    if (!question && !body.imageBase64) {
      return new Response("缺少问题", { status: 400 });
    }
    const systemContent = body.systemPrompt ?? DEFAULT_SYSTEM;

    // Image mode: use DashScope Qwen-VL for vision analysis
    if (body.imageBase64) {
      const dashscopeKey = process.env.DASHSCOPE_API_KEY;
      if (!dashscopeKey) {
        return new Response("视觉分析功能未配置（缺少 DASHSCOPE_API_KEY）", { status: 500 });
      }
      const visionRes = await fetch(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dashscopeKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen-vl-plus",
            messages: [
              { role: "system", content: systemContent },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: body.imageBase64 } },
                  { type: "text", text: question || "请帮我解答这道题" },
                ],
              },
            ],
            max_tokens: 1500,
          }),
        }
      );
      if (!visionRes.ok) {
        const errText = await visionRes.text();
        throw new Error(`图片分析请求失败: ${visionRes.status} - ${errText}`);
      }
      const visionData = await visionRes.json();
      const replyContent = visionData.choices?.[0]?.message?.content;
      const text = typeof replyContent === "string"
        ? replyContent
        : Array.isArray(replyContent)
          ? replyContent.map((c: any) => c.text ?? "").join("")
          : "无法解析图片内容，请重试。";
      return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // Text mode: streaming with conversation history
    const history = body.history ?? [];
    // Append current question to history for the API call
    const fullHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history,
      { role: "user", content: question },
    ];
    const completion = await streamAnswerWithHistory(fullHistory, systemContent);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return new Response(message, { status: 500 });
  }
}
