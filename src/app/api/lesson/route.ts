import { NextRequest } from "next/server";
import { generateLessonPlan } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get("q");

  if (!question || question.trim().length === 0) {
    return new Response(
      encodeSSE("error", { message: "请输入问题" }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(encodeSSE(event, data))); } catch { /* client disconnected */ }
      };

      try {
        enqueue("loading", { message: "AI 老师正在备课..." });

        const lessonPlan = await generateLessonPlan(question.trim());

        enqueue("title", { title: lessonPlan.title });

        for (let i = 0; i < lessonPlan.segments.length; i++) {
          const seg = lessonPlan.segments[i];
          enqueue("segment", {
            index: i,
            text: seg.text,
            keywords: seg.keywords,
            concepts: seg.concepts ?? [],
            visualItems: seg.visualItems ?? [],
          });
        }

        enqueue("done", { total: lessonPlan.segments.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        console.error("API 处理失败:", err);
        enqueue("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
