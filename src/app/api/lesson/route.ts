import { NextRequest } from "next/server";
import { generateLessonPlan } from "@/lib/deepseek";
import { getLessonSession } from "@/lib/lessonSession";

export const runtime = "nodejs";
export const maxDuration = 300;

function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get("q");
  const sid = searchParams.get("sid");
  let sessionPayload = null;
  try {
    sessionPayload = sid ? await getLessonSession(sid) : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "读取会话失败";
    return new Response(
      encodeSSE("error", { message }),
      { status: 500, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  if ((!question || question.trim().length === 0) && !sessionPayload) {
    return new Response(
      encodeSSE("error", { message: "请提供学习主题或会话信息" }),
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

        const lessonPlan = await generateLessonPlan(sessionPayload ?? question!.trim());

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sid = typeof body?.sid === "string" ? body.sid : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const sessionPayload = sid ? await getLessonSession(sid) : null;

    if (!sessionPayload && !question) {
      return Response.json({ error: "请提供学习主题或会话信息" }, { status: 400 });
    }

    const lessonPlan = await generateLessonPlan(sessionPayload ?? question);
    return Response.json(lessonPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return Response.json({ error: message }, { status: 500 });
  }
}
