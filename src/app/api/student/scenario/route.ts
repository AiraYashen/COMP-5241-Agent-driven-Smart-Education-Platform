import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";
import { getScenario } from "@/lib/scenarios";
import { createAdminClient } from "@/lib/supabase";

// History entry: one completed chapter + what the student chose
interface HistoryEntry {
  chapter: object;       // full chapter JSON shown to the student
  chosen_key: string;    // e.g. "A", "D"
  chosen_label: string;  // e.g. "A" | "D（自定义文本）"
  chosen_text: string;   // full text of the chosen option (empty string for non-D if text unavailable)
}

// Shape stored in choices_json column
interface SessionHistory {
  history: HistoryEntry[];
  pending_chapter: object | null; // chapter currently displayed, awaiting a choice
}

export async function POST(req: NextRequest) {
  try {
    const { action, scenarioId, studentId, sessionId, choiceKey, customText } = await req.json();
    const supabase = createAdminClient();

    if (action === "start") {
      if (!scenarioId || !studentId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const scenario = getScenario(scenarioId);
      if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

      // Create DB session (empty history, no pending chapter yet)
      const { data: sess, error: sessErr } = await supabase
        .from("scenario_sessions")
        .insert({
          student_id: studentId,
          scenario_id: scenarioId,
          choices_json: { history: [], pending_chapter: null } as any,
          chapter_index: 0,
        })
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

      // Save chapter 1 as pending (awaiting student choice)
      await supabase
        .from("scenario_sessions")
        .update({ choices_json: { history: [], pending_chapter: chapter } as any })
        .eq("id", sess.id);

      return NextResponse.json({ sessionId: sess.id, chapter, totalChapters: scenario.chaptersHint });
    }

    if (action === "choice") {
      if (!sessionId || !choiceKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

      // Load session
      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = getScenario(sess.scenario_id);
      if (!scenario) return NextResponse.json({ error: "Scenario config missing" }, { status: 404 });

      const sessionHistory: SessionHistory = sess.choices_json ?? { history: [], pending_chapter: null };
      const pendingChapter = sessionHistory.pending_chapter as any;

      // Find the full text of the chosen option from the pending chapter
      const chosenOption = pendingChapter?.choices?.find((c: any) => c.key === choiceKey);
      const chosenText = choiceKey === "D" && customText
        ? customText
        : (chosenOption?.text ?? "");
      const chosenLabel = choiceKey === "D" && customText
        ? `D（${customText}）`
        : choiceKey;

      // Append this completed chapter + choice to history
      const newHistory: HistoryEntry[] = [
        ...sessionHistory.history,
        {
          chapter: pendingChapter,
          chosen_key: choiceKey,
          chosen_label: chosenLabel,
          chosen_text: chosenText,
        },
      ];

      const nextChapterIndex = sess.chapter_index + 2;
      const isFinal = nextChapterIndex > scenario.chaptersHint;

      // Rebuild full multi-turn conversation so AI has complete context
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: scenario.openingPrompt },
        { role: "user", content: `生成第1章的开场。这是情景的开始，要有沉浸式的引入。返回 JSON。` },
      ];
      for (const entry of newHistory) {
        // AI's previous response (the chapter it generated)
        messages.push({ role: "assistant", content: JSON.stringify(entry.chapter) });
        // Student's choice as a user turn
        const choiceDesc = entry.chosen_key === "D"
          ? `学生选择了 D（自定义）：「${entry.chosen_text}」`
          : `学生选择了 ${entry.chosen_key}：「${entry.chosen_text}」`;
        const isThisTheFinalTurn = newHistory.indexOf(entry) === newHistory.length - 1;
        const chapterNum = (entry.chapter as any).chapter + 1;
        messages.push({
          role: "user",
          content: `${choiceDesc}。请根据这个选择，生成第${chapterNum}章，剧情要与学生的选择直接相关，体现这个选择的后果。${isThisTheFinalTurn && isFinal ? '这是最后一章，给出结局叙事，设置 "is_final": true，"choices" 设为空数组 []。' : ""}返回 JSON。`,
        });
      }

      const text = await deepseekChat(messages, { max_tokens: 1200 });
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const chapter = JSON.parse(cleaned);

      // Update session: save new history and new pending chapter
      await supabase.from("scenario_sessions").update({
        choices_json: { history: newHistory, pending_chapter: chapter } as any,
        chapter_index: nextChapterIndex - 1,
      }).eq("id", sessionId);

      return NextResponse.json({ chapter, totalChapters: scenario.chaptersHint, isFinal });
    }

    if (action === "complete") {
      if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = getScenario(sess.scenario_id);
      if (!scenario) return NextResponse.json({ error: "Scenario config missing" }, { status: 404 });

      const sessionHistory: SessionHistory = sess.choices_json ?? { history: [], pending_chapter: null };
      const choiceSummary = sessionHistory.history
        .map((e) => {
          const chNum = (e.chapter as any).chapter ?? "?";
          const chTitle = (e.chapter as any).title ?? "";
          return `第${chNum}章「${chTitle}」→ 选择了 ${e.chosen_label}：${e.chosen_text}`;
        })
        .join("；\n");

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
学生每章的选择记录：
${choiceSummary}
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

