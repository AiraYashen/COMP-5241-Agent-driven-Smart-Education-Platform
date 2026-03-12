// 共享类型定义（客户端和服务端均可使用）

export interface Concept {
  name: string;        // 关键概念名称
  explanation: string; // 通俗一句话解释
  color: string;       // "blue" | "purple" | "green" | "amber" | "rose" | "cyan"
}

/** 结构化可视卡片，每段讲解对应 4-6 个，逐一动画显示 */
export type VisualItem =
  | { type: "keyword"; term: string; desc?: string; color?: string }
  | { type: "formula"; label?: string; latex: string }
  | { type: "fact"; text: string; highlight?: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "comparison"; left: { label: string; items: string[] }; right: { label: string; items: string[] } }
  | { type: "diagram"; code: string; caption?: string };  // Mermaid 流程图

export interface SegmentData {
  index: number;
  text: string;
  keywords: string[];
  concepts: Concept[];
  visualItems?: VisualItem[];  // 结构化可视卡片组（逐帧显示）
  simplifiedText?: string;     // 再讲一遍时返回的更通俗版本
}

export interface LessonPlan {
  title: string;
  segments: Array<{
    text: string;
    keywords: string[];
    concepts: Concept[];
    visualItems?: VisualItem[];
  }>;
}

export interface ChatRecord {
  role: "user" | "ai";
  content: string;
  timestamp: number;
}
