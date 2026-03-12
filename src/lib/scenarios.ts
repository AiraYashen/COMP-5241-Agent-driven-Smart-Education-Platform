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
  "narrative": "叙事内容（150-200字，生动的情景描述）",
  "narrator_hint": "旁白提示（50字以内，引导思考的问题）",
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
  {
    id: "newton",
    title: "牛顿的苹果树·物理探索",
    subject: "物理",
    subjectIcon: "理",
    era: "17世纪英国剑桥",
    role: "年轻的自然哲学家助手",
    narratorName: "实验室老管家",
    difficulty: "初级",
    description: "和牛顿一起在实验与思辨中，发现万有引力的奥秘",
    openingPrompt: `你是一个精通物理学史的沉浸式教育游戏引擎。

情景设定：
- 时代：17世纪英国剑桥（1666年，鼠疫封锁期间）
- 学生角色：牛顿的年轻助手
- 旁白角色：实验室老管家
- 主题：牛顿运动定律与万有引力定律的发现过程
- 教学目标：理解物理学的发现路径、科学推理方法、牛顿三大定律

每一章节你需要：
1. 描述一个真实物理实验或思想实验情景（150-200字）
2. 提出一个物理概念判断问题
3. 提供3个代表不同物理认知水平的选项（A/B/C）

返回严格 JSON（不要 markdown 代码块）：
{
  "chapter": 章节序号,
  "title": "本章标题",
  "narrative": "叙事内容（150-200字）",
  "narrator_hint": "旁白提示（物理概念引导）",
  "choices": [
    {"key": "A", "text": "选项内容", "hint": "物理角度"},
    {"key": "B", "text": "选项内容", "hint": "物理角度"},
    {"key": "C", "text": "选项内容", "hint": "物理角度"}
  ],
  "is_final": false
}`,
    realHistoryFacts: `牛顿力学的真实历史：
1. 牛顿第一定律（惯性定律）：物体在不受外力时保持静止或匀速直线运动
2. 牛顿第二定律：F=ma，力等于质量乘加速度
3. 牛顿第三定律：作用力与反作用力等大反向
4. 万有引力：F=GMm/r²，任意两物体间都有引力
5. 苹果故事：1666年牛顿避鼠疫回乡，观察苹果落地引发思考（真实性有争议）
6. 意义：经典力学奠基，统一了天体运动与地面运动的解释框架`,
    chaptersHint: 4,
  },
  {
    id: "market",
    title: "明朝商人·经济博弈",
    subject: "数学·经济",
    subjectIcon: "数",
    era: "明朝中期江南市镇",
    role: "年轻商人掌柜",
    narratorName: "老账房先生",
    difficulty: "高级",
    description: "运用数学与经济逻辑，在明代市场中做出最优决策",
    openingPrompt: `你是一个融合数学思维和历史背景的教育游戏引擎。

情景设定：
- 时代：明朝中期（约1550年）江南苏州
- 学生角色：家族商行的年轻掌柜
- 旁白角色：老账房先生
- 主题：数学在商业决策中的应用（利润、比例、统计思维）
- 教学目标：数学逻辑、概率思维、资源分配优化

每一章节在商业情景中设置数学判断题：
1. 描述一个真实的市场/交易情景（100-150字）
2. 提出一个需要数学/逻辑推理的商业决策
3. 提供3个选项，其中一个最优（需要计算或推理）

返回严格 JSON（不要 markdown 代码块）：
{
  "chapter": 章节序号,
  "title": "本章标题",
  "narrative": "叙事内容（100-150字）",
  "narrator_hint": "旁白提示（数学提示）",
  "choices": [
    {"key": "A", "text": "选项内容（含具体数字）", "hint": "策略角度"},
    {"key": "B", "text": "选项内容", "hint": "策略角度"},
    {"key": "C", "text": "选项内容", "hint": "策略角度"}
  ],
  "is_final": false
}`,
    realHistoryFacts: `明代商业与数学知识：
1. 算盘：明代商业计算的核心工具，《算法统宗》（1592年）是当时最权威的数学著作
2. 牙行制度：官方认可的中间商，抽取佣金约3-5%
3. 丝绸贸易：苏州丝绸远销海外，利润可达成本的200-300%
4. 风险分散：明代商人懂得分批发货、多路运输的风险分散原则
5. 银两换算：1两白银≈10钱≈100分，与现代十进制对应`,
    chaptersHint: 4,
  },
];

export function getScenario(id: string): ScenarioConfig | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
