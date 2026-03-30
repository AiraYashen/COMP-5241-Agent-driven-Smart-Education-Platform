import { NextRequest, NextResponse } from "next/server";
import { deepseekChat } from "@/lib/deepseek";
import { getScenario, ScenarioConfig } from "@/lib/scenarios";
import { createAdminClient } from "@/lib/supabase";

export const maxDuration = 120;

// History entry: one completed chapter + what the student chose
interface HistoryEntry {
  chapter: object;       // full chapter JSON shown to the student
  chosen_key: string;    // e.g. "A", "D"
  chosen_label: string;  // e.g. "A" | "D（自定义文本）"
  chosen_text: string;   // full text of the chosen option
}

// Shape stored in choices_json column
interface SessionHistory {
  history: HistoryEntry[];
  pending_chapter: object | null; // chapter currently displayed, awaiting a choice
}

/** Check if a string looks like a UUID */
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/** Build a ScenarioConfig from a DB theme row */
function buildScenarioConfig(t: {
  id: string;
  title: string;
  subject: string;
  subject_icon: string;
  era: string;
  role_name: string;
  narrator_name: string;
  difficulty: string;
  description: string;
  background: string;
  real_history: string;
  chapters_hint: number;
}): ScenarioConfig {
  const openingPrompt = `你是一个精通${t.subject}的沉浸式角色扮演游戏引擎。

情景设定：
- 时代：${t.era}
- 学生角色：${t.role_name}
- 旁白角色：${t.narrator_name}
- 主题：${t.title}
- 背景与教学目标：${t.background}

每一章节你需要：
1. 用生动的第二人称叙事描述当前情况（150-200字）
2. 明确标注【旁白·${t.narrator_name}】引导学生思考
3. 提供3个不同策略选项（A/B/C），每个选项代表不同历史逻辑
4. 选项要有内在逻辑差异（如：外交优先 vs 军事威慑 vs 合作商议）

返回严格 JSON（不要 markdown 代码块）：
{
  "chapter": 章节序号,
  "title": "本章标题（8字以内）",
  "title_en": "标题的英文翻译（简洁准确）",
  "narrative": "叙事内容（150-200字，生动的情景描述）",
  "narrator_hint": "旁白提示（50字以内，引导思考的问题）",
  "image_keywords": ["关键词1","关键词2","关键词3","关键词4","关键词5"],
  "choices": [
    {"key": "A", "text": "选项内容（20字以内）", "hint": "战略倾向（10字以内）"},
    {"key": "B", "text": "选项内容", "hint": "战略倾向"},
    {"key": "C", "text": "选项内容", "hint": "战略倾向"}
  ],
  "is_final": false
}`;

  return {
    id: t.id,
    title: t.title,
    subject: t.subject,
    subjectIcon: t.subject_icon,
    era: t.era,
    role: t.role_name,
    narratorName: t.narrator_name,
    difficulty: t.difficulty as "初级" | "中级" | "高级",
    description: t.description || "",
    openingPrompt,
    realHistoryFacts: t.real_history || "",
    chaptersHint: t.chapters_hint,
  };
}

/**
 * 兜底：从维基百科搜索配图
 */
async function fetchImageByWikipedia(titleEn: string | undefined, keywords: string[] | undefined): Promise<string | null> {
  const kws = (keywords && Array.isArray(keywords)) ? keywords : [];
  const t = (titleEn || "").trim();
  const attempts: string[] = [];
  if (t && kws.length >= 2) attempts.push(`${t} ${kws.slice(0, 2).join(" ")}`);
  if (t && kws.length >= 3) attempts.push(`${t} ${kws.slice(0, 3).join(" ")}`);
  if (t) attempts.push(t + (kws.length ? " " + kws.join(" ") : ""));
  if (kws.length >= 2) attempts.push(kws.slice(0, 2).join(" "));
  if (kws.length) attempts.push(kws.join(" "));
  const seen = new Set<string>();
  const unique = attempts.filter(a => a && !seen.has(a) && seen.add(a));
  if (unique.length === 0) return null;
  try {
    const UA = "ChronoCopilot/1.0 (educational-app)";
    for (const query of unique) {
      const searchParams = new URLSearchParams({
        action: "query", list: "search",
        srsearch: query, srlimit: "5",
        format: "json", origin: "*",
      });
      const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams}`,
        { headers: { "User-Agent": UA }, cache: "no-store" });
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const results: any[] = searchData?.query?.search ?? [];
      for (const result of results.slice(0, 3)) {
        const imgParams = new URLSearchParams({
          action: "query", titles: result.title,
          prop: "pageimages", piprop: "thumbnail", pithumbsize: "800",
          format: "json", origin: "*",
        });
        const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?${imgParams}`,
          { headers: { "User-Agent": UA }, cache: "no-store" });
        if (!imgRes.ok) continue;
        const imgData = await imgRes.json();
        const page = Object.values(imgData?.query?.pages ?? {})[0] as any;
        const thumb: string | undefined = page?.thumbnail?.source;
        if (thumb) return thumb;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 使用阿里云 DashScope wanx 模型 AI 生成场景配图。
 * 若未配置 DASHSCOPE_API_KEY 或生成失败，自动回退到维基百科搜图。
 */
async function generateScenarioImage(
  titleEn: string | undefined,
  keywords: string[] | undefined,
): Promise<string | null> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return fetchImageByWikipedia(titleEn, keywords);
  }

  try {
    const kws = (keywords && Array.isArray(keywords)) ? keywords.filter(Boolean) : [];
    const titlePart = (titleEn ?? "").trim();
    const kwPart = kws.slice(0, 5).join(", ");
    const prompt = [
      titlePart,
      kwPart,
      "historical scene, cinematic composition, dramatic lighting, detailed illustration, wide angle, epic atmosphere",
    ].filter(Boolean).join(", ");

    // 提交生成任务
    const submitRes = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify({
          model: "wanx2.1-t2i-turbo",
          input: {
            prompt,
            negative_prompt: "text, watermark, logo, signature, ugly, blurry, low quality, modern",
          },
          parameters: {
            size: "1024*576",
            n: 1,
          },
        }),
      }
    );

    if (!submitRes.ok) {
      console.warn("AI 图片生成任务提交失败:", submitRes.status);
      return fetchImageByWikipedia(titleEn, keywords);
    }

    const submitData = await submitRes.json();
    const taskId = submitData?.output?.task_id;
    if (!taskId) {
      console.warn("AI 图片生成：未获取到 task_id");
      return fetchImageByWikipedia(titleEn, keywords);
    }

    // 轮询任务结果，最多等待 60 秒
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { "Authorization": `Bearer ${apiKey}` } }
      );
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      const status = pollData?.output?.task_status;
      if (status === "SUCCEEDED") {
        const url: string | undefined = pollData?.output?.results?.[0]?.url;
        if (url) return url;
        break;
      }
      if (status === "FAILED") {
        console.warn("AI 图片生成任务失败:", JSON.stringify(pollData?.output));
        break;
      }
    }

    // 超时或失败 → 回退
    return fetchImageByWikipedia(titleEn, keywords);
  } catch (err) {
    console.warn("AI 图片生成异常，回退到维基百科:", err);
    return fetchImageByWikipedia(titleEn, keywords);
  }
}

/** Resolve scenario config from DB theme or static list */
async function resolveScenario(scenarioId: string, supabase: ReturnType<typeof createAdminClient>): Promise<ScenarioConfig | null> {
  if (isUUID(scenarioId)) {
    const { data } = await supabase.from("scenario_themes").select("*").eq("id", scenarioId).single();
    if (!data) return null;
    return buildScenarioConfig(data);
  }
  return getScenario(scenarioId) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, scenarioId, studentId, sessionId, choiceKey, customText, saveName } = body;
    const supabase = createAdminClient();

    // ── action: start ──────────────────────────────────────────────────────────
    if (action === "start") {
      if (!scenarioId || !studentId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const scenario = await resolveScenario(scenarioId, supabase);
      if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

      // Auto-generate save name if not provided
      const { count } = await supabase
        .from("scenario_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("scenario_id", scenarioId);
      const finalSaveName = saveName || `存档 #${(count ?? 0) + 1}`;

      // Create DB session (empty history, no pending chapter yet)
      const { data: sess, error: sessErr } = await supabase
        .from("scenario_sessions")
        .insert({
          student_id: studentId,
          scenario_id: scenarioId,
          choices_json: { history: [], pending_chapter: null } as any,
          chapter_index: 0,
          save_name: finalSaveName,
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
      const imageUrl = await generateScenarioImage(chapter.title_en, chapter.image_keywords);

      // Save chapter 1 as pending, store imageUrl for resume
      await supabase
        .from("scenario_sessions")
        .update({ choices_json: { history: [], pending_chapter: { ...chapter, _image_url: imageUrl } } as any })
        .eq("id", sess.id);

      return NextResponse.json({ sessionId: sess.id, chapter, imageUrl, totalChapters: scenario.chaptersHint, saveName: finalSaveName });
    }

    // ── action: load ───────────────────────────────────────────────────────────
    if (action === "load") {
      if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = await resolveScenario(sess.scenario_id, supabase);
      if (!scenario) return NextResponse.json({ error: "Scenario config missing" }, { status: 404 });

      const sessionHistory: SessionHistory = sess.choices_json ?? { history: [], pending_chapter: null };
      const pendingChapter = sessionHistory.pending_chapter as any;

      // Use stored image URL or re-fetch
      let imageUrl: string | null = pendingChapter?._image_url ?? null;
      if (!imageUrl && pendingChapter?.title_en) {
        imageUrl = await generateScenarioImage(pendingChapter.title_en, pendingChapter.image_keywords);
      }

      return NextResponse.json({
        chapter: pendingChapter,
        imageUrl,
        totalChapters: scenario.chaptersHint,
        completed: sess.completed,
        report: sess.report_json ?? null,
        saveName: sess.save_name,
        scenarioTitle: scenario.title,
        scenarioSubjectIcon: scenario.subjectIcon,
        scenarioRole: scenario.role,
        scenarioNarratorName: scenario.narratorName,
      });
    }

    // ── action: choice ─────────────────────────────────────────────────────────
    if (action === "choice") {
      if (!sessionId || !choiceKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = await resolveScenario(sess.scenario_id, supabase);
      if (!scenario) return NextResponse.json({ error: "Scenario config missing" }, { status: 404 });

      const sessionHistory: SessionHistory = sess.choices_json ?? { history: [], pending_chapter: null };
      const pendingChapter = sessionHistory.pending_chapter as any;

      const chosenOption = pendingChapter?.choices?.find((c: any) => c.key === choiceKey);
      const chosenText = choiceKey === "D" && customText
        ? customText
        : (chosenOption?.text ?? "");
      const chosenLabel = choiceKey === "D" && customText
        ? `D（${customText}）`
        : choiceKey;

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

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: scenario.openingPrompt },
        { role: "user", content: `生成第1章的开场。这是情景的开始，要有沉浸式的引入。返回 JSON。` },
      ];
      for (const entry of newHistory) {
        messages.push({ role: "assistant", content: JSON.stringify(entry.chapter) });
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
      const imageUrl = await generateScenarioImage(chapter.title_en, chapter.image_keywords);

      await supabase.from("scenario_sessions").update({
        choices_json: { history: newHistory, pending_chapter: { ...chapter, _image_url: imageUrl } } as any,
        chapter_index: nextChapterIndex - 1,
      }).eq("id", sessionId);

      return NextResponse.json({ chapter, imageUrl, totalChapters: scenario.chaptersHint, isFinal });
    }

    // ── action: complete ───────────────────────────────────────────────────────
    if (action === "complete") {
      if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

      const { data: sess } = await supabase.from("scenario_sessions").select("*").eq("id", sessionId).single();
      if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const scenario = await resolveScenario(sess.scenario_id, supabase);
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

      // Mark session completed and persist report
      await supabase.from("scenario_sessions").update({
        completed: true,
        report_json: report,
      }).eq("id", sessionId);

      return NextResponse.json({ report, scenarioTitle: scenario.title });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
