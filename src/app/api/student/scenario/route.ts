import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";
import { getScenario } from "@/lib/scenarios";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { action, scenarioId, studentId, sessionId, choiceKey } = await req.json();
    const supabase = createAdminClient();

    if (action === "start") {
      if (!scenarioId || !studentId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const scenario = getScenario(scenarioId);
      if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

      // Create DB session
      const { data: sess, error: sessErr } = await supabase
        .from("scenario_sessions")
        .insert({ student_id: studentId, scenario_id: scenarioId, choices_json: [], chapter_index: 0 })
        .select()
        .single();
      if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });

      // Generate opening chapter
      const messages = [
        { role: "system" as const, content: scenario.openingPrompt },
        { role: "user" as const, content: `生成第1章的开场。这是情景的开始，要有沉浸式的引入。返回 JSON。` },
      ];
      const text = await deepseekChat(messages, { max_tokens: 1200 });
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const chapter = JSON.parse(cleaned);

      return NextResponse.json({ sessionId: sess.id, chapter, totalChapters: scenario.chaptersHint });
    }

    if (action === "choice") {
      if (!sessionId || !choiceKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

      // Load session
      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = getScenario(sess.scenario_id);
      if (!scenario) return NextResponse.json({ error: "Scenario config missing" }, { status: 404 });

      const choices: { chapter: number; choice: string }[] = sess.choices_json ?? [];
      choices.push({ chapter: sess.chapter_index + 1, choice: choiceKey });

      const nextChapter = sess.chapter_index + 2;
      const isFinal = nextChapter > scenario.chaptersHint;

      // Build message history for continuity
      const choiceSummary = choices.map((c) => `第${c.chapter}章选择：${c.choice}`).join("；");
      const messages = [
        { role: "system" as const, content: scenario.openingPrompt },
        {
          role: "user" as const,
          content: `学生到目前为止的选择历史：${choiceSummary}。
现在生成第${nextChapter}章。${isFinal ? '这是最后一章，请在叙事中给出学生选择的直接后果，并铺垫现实对比。设置 "is_final": true。' : ""}
返回 JSON。`,
        },
      ];
      const text = await deepseekChat(messages, { max_tokens: 1200 });
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const chapter = JSON.parse(cleaned);

      // Update session
      await supabase.from("scenario_sessions").update({
        choices_json: choices,
        chapter_index: nextChapter - 1,
      }).eq("id", sessionId);

      return NextResponse.json({ chapter, totalChapters: scenario.chaptersHint, isFinal });
    }

    if (action === "complete") {
      if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = getScenario(sess.scenario_id);
      if (!scenario) return NextResponse.json({ error: "Scenario config missing" }, { status: 404 });

      const choices: { chapter: number; choice: string }[] = sess.choices_json ?? [];
      const choiceSummary = choices.map((c) => `第${c.chapter}章选了${c.choice}`).join("，");

      const messages = [
        {
          role: "system" as const,
          content: `你是一位历史/学科老师，负责在模拟结束后给学生做"现实对比"总结。
返回严格 JSON（不要 markdown 代码块）：
{
  "student_outcome": "根据学生选择推演出的结果摘要（100字）",
  "real_history": "真实历史上的结果（100字）",
  "key_difference": "最核心的差异点（50字）",
  "reflection": "给学生的思考建议（80字）",
  "score": 1到100之间的数字（根据选择质量评分）
}`,
        },
        {
          role: "user" as const,
          content: `情景：${scenario.title}
学生选择记录：${choiceSummary}
真实历史参考：${scenario.realHistoryFacts}
请生成 Reality Sync 对比报告。`,
        },
      ];
      const text = await deepseekChat(messages, { max_tokens: 800 });
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const report = JSON.parse(cleaned);

      // Mark session completed
      await supabase.from("scenario_sessions").update({ completed: true }).eq("id", sessionId);

      return NextResponse.json({ report, scenarioTitle: scenario.title });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
