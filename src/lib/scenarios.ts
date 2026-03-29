export interface ScenarioConfig {
  id: string;
  title: string;
  subject: string;
  subjectIcon: string;
  era: string;
  role: string;
  narratorName: string;
  difficulty: "初级" | "中级" | "高级";
  description: string;
  openingPrompt: string;
  realHistoryFacts: string;
  chaptersHint: number;
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "zhenghe",
    title: "大明航海志·郑和篇",
    subject: "历史",
    subjectIcon: "历",
    era: "明朝永乐年间（公元1405年）",
    role: "郑和船队副统领",
    narratorName: "副舰长林海",
    difficulty: "中级",
    description: "化身郑和船队决策者，在七下西洋的波涛中做出改变历史的抉择",
    openingPrompt: `你是一个精通中国古代历史的沉浸式角色扮演游戏引擎。

情景设定：
- 时代：${`明朝永乐年间（公元1405年）`}
- 学生角色：郑和船队副统领
- 旁白角色：副舰长林海
- 主题：郑和下西洋的外交、贸易与军事决策
- 教学目标：理解明朝朝贡体系、郑和航行意义、明朝对外政策

每一章节你需要：
1. 用生动的第二人称叙事描述当前情况（150-200字）
2. 明确标注【旁白·副舰长林海】引导学生思考
3. 提供3个不同策略选项（A/B/C），每个选项代表不同历史逻辑
4. 选项要有内在逻辑差异（如：外交优先 vs 军事威慑 vs 贸易为主）

返回严格 JSON（不要 markdown 代码块）：
{
  "chapter": 章节序号,
  "title": "本章标题（8字以内）",
  "title_en": "标题的英文翻译（简洁准确，如 Cannon Battle at Sea, Arrival at Malacca）",
  "narrative": "叙事内容（150-200字，生动的情景描述）",
  "narrator_hint": "旁白提示（50字以内，引导思考的问题）",
  "image_keywords": ["关键词1","关键词2","关键词3","关键词4","关键词5"],
  // image_keywords 规则：根据本章narrative内容和标题，提炼5个英文关键词，按重要性排序（最核心的放最前）。
  // 必须使用具体的历史专有名词（人名、地名、事件名、器物名），禁止笼统词如 history, ancient, Chinese, ship。
  // 例：["Chen Zuyi","Strait of Malacca","pirate fleet","naval battle","gunpowder cannon"],
  "choices": [
    {"key": "A", "text": "选项内容（20字以内）", "hint": "战略倾向（10字以内）"},
    {"key": "B", "text": "选项内容", "hint": "战略倾向"},
    {"key": "C", "text": "选项内容", "hint": "战略倾向"}
  ],
  "is_final": false
}`,
    realHistoryFacts: `郑和七次下西洋（1405-1433年）的真实历史：
1. 目的：宣扬明朝国威、寻找朱允炆（建文帝）、建立朝贡体系、获取奇珍异宝
2. 规模：最大船队约240艘船，2.7万余人，宝船长约120米
3. 路线：东南亚→印度→阿拉伯半岛→东非
4. 方式：以怀柔为主，军事为辅（遇海盗才动武）
5. 意义：建立了以明朝为核心的朝贡贸易体系，促进文化交流
6. 结局：1433年郑和去世后，明朝禁海，航海时代就此终结`,
    chaptersHint: 5,
  },
];

export function getScenario(id: string): ScenarioConfig | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
