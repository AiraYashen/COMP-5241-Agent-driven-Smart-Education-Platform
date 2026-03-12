import { NextRequest } from "next/server";
import { streamAnswer, deepseekChat } from "@/lib/deepseek";
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
    };
    const question = body.userQuestion ?? body.question ?? "";
    if (!question && !body.imageBase64) {
      return new Response("缺少问题", { status: 400 });
    }
    const systemContent = body.systemPrompt ?? DEFAULT_SYSTEM;

    // Image mode: non-streaming response
    if (body.imageBase64) {
      const messages: any[] = [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: [
            { type: "text", text: question || "请帮我解答这道题" },
            { type: "image_url", image_url: { url: body.imageBase64 } },
          ],
        },
      ];
      const text = await deepseekChat(messages, { max_tokens: 1000 });
      return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const completion = await streamAnswer(question, body.context ?? "", systemContent);
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
