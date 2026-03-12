"use client";

import { useEffect, useState, useRef } from "react";
import katex from "katex";
import { SegmentData, VisualItem } from "@/types/lesson";

/* ─── Mermaid 单例初始化（只初始化一次）─────────────────────── */
let mermaidInitialized = false;
async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!mermaidInitialized) {
    mermaidInitialized = true;
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        background: "#0f172a",
        primaryColor: "#4f46e5",
        primaryTextColor: "#e2e8f0",
        primaryBorderColor: "#6366f1",
        lineColor: "#6366f1",
        secondaryColor: "#1e1b4b",
        tertiaryColor: "#1e293b",
        edgeLabelBackground: "#1e293b",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      },
    });
  }
  return mermaid;
}

/* ─── 颜色映射 ─────────────────────────────────────────────── */
const COLORS: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  blue:   { bg: "bg-blue-950/60",    border: "border-blue-500/40",    text: "text-blue-200",    dot: "bg-blue-400",    glow: "shadow-blue-500/20" },
  purple: { bg: "bg-purple-950/60",  border: "border-purple-500/40",  text: "text-purple-200",  dot: "bg-purple-400",  glow: "shadow-purple-500/20" },
  green:  { bg: "bg-emerald-950/60", border: "border-emerald-500/40", text: "text-emerald-200", dot: "bg-emerald-400", glow: "shadow-emerald-500/20" },
  amber:  { bg: "bg-amber-950/60",   border: "border-amber-500/40",   text: "text-amber-200",   dot: "bg-amber-400",   glow: "shadow-amber-500/20" },
  rose:   { bg: "bg-rose-950/60",    border: "border-rose-500/40",    text: "text-rose-200",    dot: "bg-rose-400",    glow: "shadow-rose-500/20" },
  cyan:   { bg: "bg-cyan-950/60",    border: "border-cyan-500/40",    text: "text-cyan-200",    dot: "bg-cyan-400",    glow: "shadow-cyan-500/20" },
};
const COLOR_SEQ = ["blue", "purple", "green", "amber", "rose", "cyan"];
const autoColor = (i: number) => COLORS[COLOR_SEQ[i % COLOR_SEQ.length]];

/* ─── 卡片组件 ──────────────────────────────────────────────── */
function KeywordCard({ item, idx }: { item: Extract<VisualItem, { type: "keyword" }>; idx: number }) {
  const c = COLORS[item.color ?? COLOR_SEQ[idx % COLOR_SEQ.length]] ?? COLORS.blue;
  return (
    <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${c.bg} ${c.border} shadow-lg ${c.glow}`}>
      <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <div>
        <div className={`text-xl font-bold tracking-tight ${c.text}`}>{item.term}</div>
        {item.desc && <div className="text-sm text-gray-400 mt-0.5 leading-snug">{item.desc}</div>}
      </div>
    </div>
  );
}

function FormulaCard({ item }: { item: Extract<VisualItem, { type: "formula" }> }) {
  let html = "";
  try {
    html = katex.renderToString(item.latex, { throwOnError: false, displayMode: true });
  } catch {
    html = `<span style="color:#f87171">${item.latex}</span>`;
  }
  return (
    <div className="px-5 py-4 rounded-2xl border bg-indigo-950/40 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
      {item.label && <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">{item.label}</div>}
      <div className="overflow-x-auto text-white" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function FactCard({ item, idx }: { item: Extract<VisualItem, { type: "fact" }>; idx: number }) {
  const c = autoColor(idx);
  const text = item.text;
  const hl = item.highlight;
  let rendered: React.ReactNode = text;
  if (hl && text.includes(hl)) {
    const parts = text.split(hl);
    rendered = <>{parts[0]}<span className={`font-bold ${c.text}`}>{hl}</span>{parts.slice(1).join(hl)}</>;
  }
  return (
    <div className={`flex gap-3 px-5 py-4 rounded-2xl border ${c.bg} ${c.border} shadow-lg ${c.glow}`}>
      <span className={`flex-shrink-0 self-stretch w-1 rounded-full ${c.dot}`} />
      <p className="text-gray-100 text-sm leading-relaxed">{rendered}</p>
    </div>
  );
}

function StepsCard({ item }: { item: Extract<VisualItem, { type: "steps" }> }) {
  return (
    <div className="px-5 py-4 rounded-2xl border bg-white/[0.04] border-white/10 shadow-lg">
      {item.title && <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{item.title}</div>}
      <ol className="space-y-2">
        {item.items.map((step, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-gray-200">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ComparisonCard({ item }: { item: Extract<VisualItem, { type: "comparison" }> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[item.left, item.right].map((side, si) => {
        const c = si === 0 ? COLORS.blue : COLORS.purple;
        return (
          <div key={si} className={`px-4 py-3 rounded-2xl border ${c.bg} ${c.border}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${c.text}`}>{side.label}</div>
            <ul className="space-y-1.5">
              {side.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function DiagramCard({ item }: { item: Extract<VisualItem, { type: "diagram" }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = await getMermaid();
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        // 兼容 JSON 字符串中 \n 和实际换行两种格式
        const code = item.code.replace(/\\n/g, "\n");
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    render();
    return () => { cancelled = true; };
  }, [item.code]);

  return (
    <div className="rounded-2xl border bg-slate-950/70 border-indigo-500/20 px-4 py-4 shadow-lg shadow-indigo-500/10">
      {item.caption && <div className="text-xs font-semibold text-indigo-400 mb-3 uppercase tracking-widest">{item.caption}</div>}
      {error ? (
        <pre className="text-red-400 text-xs overflow-x-auto whitespace-pre-wrap">{error}</pre>
      ) : svg ? (
        <div
          ref={ref}
          className="overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center gap-2 text-indigo-400 text-xs py-4 justify-center">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          渲染流程图中...
        </div>
      )}
    </div>
  );
}

function VisualItemCard({ item, idx }: { item: VisualItem; idx: number }) {
  if (item.type === "keyword")    return <KeywordCard item={item} idx={idx} />;
  if (item.type === "formula")    return <FormulaCard item={item} />;
  if (item.type === "fact")       return <FactCard item={item} idx={idx} />;
  if (item.type === "steps")      return <StepsCard item={item} />;
  if (item.type === "comparison") return <ComparisonCard item={item} />;
  if (item.type === "diagram")    return <DiagramCard item={item} />;
  return null;
}

/* ─── VisualPanel ───────────────────────────────────────────── */
interface VisualPanelProps {
  segment: SegmentData;
  isActive: boolean;      // 正在朗读此段
  isPast: boolean;        // 已经讲完（理解了之后）
  speechProgress?: number; // 语音播放进度 0-1（来自 onboundary），用于精确同步卡片
}

export default function VisualPanel({ segment, isActive, isPast, speechProgress }: VisualPanelProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Effect 1: segment 切换时重置
  useEffect(() => {
    setRevealedCount(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.index]);

  // Effect 2: isActive 变 true 时启动 interval 兜底揭示（所有浏览器均有效）
  useEffect(() => {
    const items = segment.visualItems ?? [];
    if (!isActive || items.length === 0) return;

    setRevealedCount(1); // 立即显示第一张

    // 按朗读时长估算均匀间隔
    const speechMs = Math.max((segment.text.length / 4) * 1000, 8000);
    const intervalMs = Math.min(Math.max(speechMs / (items.length + 1), 1800), 4000);

    const timer = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= items.length) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, intervalMs);
    timerRef.current = timer;

    return () => {
      clearInterval(timer);
      timerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, segment.index]);

  // Effect 2b: speechProgress 驱动精确同步（onboundary 支持时覆盖 interval，单调递增）
  useEffect(() => {
    if (!isActive || speechProgress === undefined) return;
    const items = segment.visualItems ?? [];
    if (items.length === 0) return;
    // 进度 > 2% 才开始映射，避免语音刚开始时跳到末位
    const target = speechProgress < 0.02 ? 1 : Math.max(1, Math.ceil(speechProgress * items.length));
    setRevealedCount((prev) => Math.max(prev, target));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechProgress, isActive, segment.index]);

  // Effect 3: isPast 时立即显示全部
  useEffect(() => {
    if (!isPast) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRevealedCount((segment.visualItems ?? []).length);
  }, [isPast, segment.index, segment.visualItems]);

  const items = segment.visualItems ?? [];
  const visibleItems = items.slice(0, revealedCount);
  const remaining = items.length - revealedCount;

  return (
    <div className={`transition-all duration-500 ${isPast ? "opacity-55" : "opacity-100"}`}>
      {/* 卡片区域 */}
      {items.length === 0 ? (
        <div className="flex flex-wrap gap-3">
          {segment.keywords.map((kw, i) => {
            const c = autoColor(i);
            return <div key={i} className={`px-5 py-3 rounded-2xl border ${c.bg} ${c.border} ${c.text} text-base font-semibold`}>{kw}</div>;
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item, i) => (
            <div key={`${segment.index}-${i}`} className="animate-item-reveal">
              <VisualItemCard item={item} idx={i} />
            </div>
          ))}
          {isActive && remaining > 0 && (
            <div className="flex gap-2 items-center pt-1 pl-1">
              {Array.from({ length: Math.min(remaining, 4) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-white/10 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
