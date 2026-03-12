import OpenAI from "openai";
import type { LessonPlan, VisualItem, Concept } from "@/types/lesson";

// 懒加载客户端，避免构建时无 API Key 导致失败
let _client: OpenAI | null = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    });
  }
  return _client;
}

export type { LessonPlan };

export interface LessonSegment {
  text: string;
  keywords: string[];
}

export async function generateLessonPlan(question: string): Promise<LessonPlan> {
  const systemPrompt = `你是一位风趣幽默、极其善于讲故事的老师，讲课生动活泼，擅长用生活比喻把难概念说得通俗易懂。

请严格按照以下 JSON 格式返回，不要有任何额外文字：
{
  "title": "课程标题（简洁吸引人，15字以内，可以有点悬念或趣味）",
  "segments": [
    {
      "text": "该段朗读内容（80-120字，要求：①像讲故事一样口语化 ②必须有至少一个生活比喻或类比 ③语气轻松有活力 ④适合TTS朗读不含公式符号；段数根据知识点复杂度自然决定，无需凑数；最后一段必须以"好，我们来复盘一下："开头做整课总结）",
      "keywords": ["english keyword1", "english keyword2"],
      "concepts": [
        { "name": "概念名称（2-6字）", "explanation": "用生活化的语言一句话解释", "color": "blue" }
      ],
      "visualItems": [
        { "type": "keyword", "term": "关键词", "desc": "极短解释（10字内）", "color": "blue" },
        { "type": "formula", "label": "公式名称", "latex": "LaTeX公式字符串" },
        { "type": "fact", "text": "一条核心要点（20字内）", "highlight": "高亮词" },
        { "type": "steps", "title": "流程名", "items": ["步骤1", "步骤2", "步骤3"] },
        { "type": "comparison", "left": { "label": "概念A", "items": ["特点1", "特点2"] }, "right": { "label": "概念B", "items": ["特点1", "特点2"] } },
        { "type": "diagram", "code": "合法的Mermaid语法，每行用\\n分隔", "caption": "图表说明" }
      ]
    }
  ]
}

【text 写作要求】
- 开头要抓人，可用疑问句/惊叹/小故事引入
- 必须有生活比喻（例："这就像你去超市买东西，但收银台只有一个..."）
- 语气词自然（"其实""你想想""没错""对吧"等）
- text 叙述节奏：先引入→展开核心概念→结尾点睛，每个概念只出现一次
- **段数根据知识点复杂度自然决定**，简单知识 3 段，复杂知识可多至 7 段，无需凑数
- 最后一段必须是整课总结，以"好，我们来复盘一下："开头

【visualItems 与 text 精确同步规则（核心！）】
visualItems 是 TTS 朗读时屏幕上逐张出现的"字幕卡片"，系统会将它们按语音播放进度依次显示。
因此必须做到：
1. **顺序 = 讲解顺序**：第 1 张卡对应 text 最开头讲的概念，最后一张对应 text 结尾，严格按叙述先后排列
2. **内容一一对应**：每张卡片只提取 text 中"此刻正讲到"的那个概念，绝不超前或滞后
3. **用词完全一致**：keyword.term、fact.highlight 必须与 text 中实际出现的词一字不差
4. **均匀覆盖全文**：4 张卡 → 每张覆盖约 1/4 text；5 张 → 约 1/5；保证卡片出现时机与字幕高度吻合
5. 每段 4-5 张卡片，类型尽量多样

【各类型规则】
- keyword：term 是 text 中此刻出现的核心词（2-8字），desc ≤10字解释；color 循环 blue/purple/green/amber/rose/cyan
- formula：仅数学/物理/算法用；latex 必须合法 KaTeX；对应 text 中提到该公式的位置
- fact：精炼 text 中某句核心结论（≤20字），highlight 是该句在 text 中出现的最关键2-4字
- steps：对应 text 中讲解流程的部分，步骤顺序与讲解顺序一致，每步 ≤8字
- comparison：对应 text 中做对比的部分，每侧 2-3 条，左右标签与 text 用词一致
- diagram：**凡 text 中涉及流程/分支/状态机/架构/时间线/树形结构时必须使用**
   - code 是合法 Mermaid 语法（flowchart LR/TD、gitGraph、sequenceDiagram、classDiagram、timeline等）
   - 每行用 \\n 分隔，caption 简短说明
   - Git Flow、CI/CD、网络协议、状态机等场景：diagram 是首选类型
- 总结段的 visualItems 用 fact+comparison 总结全课核心要点，关键词与各段一致

concepts color 循环：blue, purple, green, amber, rose, cyan
段落逻辑递进，由浅入深，最后必有总结段`;

  const response = await getClient().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请讲解：${question}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 6000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 返回空响应");

  const plan = JSON.parse(content) as LessonPlan;
  if (!plan.title || !Array.isArray(plan.segments) || plan.segments.length === 0) {
    throw new Error("DeepSeek 返回格式不正确");
  }
  plan.segments = plan.segments.map((s) => ({ ...s, concepts: s.concepts ?? [] }));
  return plan;
}

/** 学生没懂时，从全新角度生成一个补充讲解段（含 visualItems），插入课程流程 */
export async function generateAdaptiveSegment(
  originalText: string,
  question: string,
  attemptNumber: number
): Promise<{ text: string; keywords: string[]; concepts: Concept[]; visualItems: VisualItem[] }> {
  const angles = [
    "换一个完全不同的生活比喻，从零开始重新解释，像在给没有基础的朋友讲",
    "用具体的数字/实例/场景来演示，让学生能亲手感受这个过程",
    "分步骤拆解，把每一步单独讲清楚，用类比辅助理解",
  ];
  const angle = angles[(attemptNumber - 1) % angles.length];

  const systemPrompt = `你是一位耐心的老师，学生刚才没听懂，请从全新角度生成一段补充讲解。

要求：
- 讲解角度：${angle}
- text：60-90字，口语化，适合TTS朗读，不含公式符号
- visualItems：3-4张卡片，顺序必须与 text 叙述顺序完全一致，每张卡片的关键词与 text 中出现的词一字不差

严格按 JSON 格式返回，不要有任何额外文字：
{
  "text": "补充讲解内容",
  "keywords": ["english keyword"],
  "concepts": [{"name": "概念", "explanation": "一句话解释", "color": "blue"}],
  "visualItems": [
    { "type": "keyword", "term": "核心词", "desc": "极短解释", "color": "blue" },
    { "type": "fact", "text": "核心结论", "highlight": "关键词" }
  ]
}`;

  const response = await getClient().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `课题：${question}\n\n学生没听懂的内容：${originalText}\n\n请换个角度重新讲解。` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.85,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 返回空响应");
  const result = JSON.parse(content) as { text: string; keywords: string[]; concepts: Concept[]; visualItems: VisualItem[] };
  return {
    text: result.text ?? originalText,
    keywords: result.keywords ?? [],
    concepts: result.concepts ?? [],
    visualItems: result.visualItems ?? [],
  };
}

/** 通用单次对话，返回文本内容（供 API routes 使用）*/
export async function deepseekChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: any }>,
  opts?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.max_tokens ?? 1500,
  });
  return response.choices[0]?.message?.content ?? "";
}

/** 流式回答学生的追问 */
export async function streamAnswer(userQuestion: string, context: string, systemPrompt?: string) {
  const sysContent = systemPrompt ?? "你是一位耐心的老师，正在给学生上课。学生提了一个问题，请用通俗易懂的语言简短回答（100字以内），多用比喻，友好亲切。";
  return getClient().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: sysContent },
      { role: "user", content: context ? `当前课题背景：${context}\n\n学生问：${userQuestion}` : userQuestion },
    ],
    temperature: 0.7,
    max_tokens: 400,
    stream: true,
  });
}
