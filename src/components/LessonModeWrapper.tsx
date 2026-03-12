"use client";

import { useEffect, useRef, useState } from "react";
import LessonPlayer from "@/components/LessonPlayer";

type Mode = "audio" | "text" | "mindmap";

const MODES: { key: Mode; label: string }[] = [
  { key: "audio", label: "演讲模式" },
  { key: "text", label: "阅读模式" },
  { key: "mindmap", label: "脑图模式" },
];

interface Props {
  question: string;
}

export default function LessonModeWrapper({ question }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [mindmapHtml, setMindmapHtml] = useState<string | null>(null);
  const [generatingText, setGeneratingText] = useState(false);
  const [generatingMindmap, setGeneratingMindmap] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lesson_mode") as Mode | null;
    setMode(stored ?? "audio");
  }, []);

  const changeMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem("lesson_mode", m);
  };

  // Text mode: generate lesson text without audio
  useEffect(() => {
    if (mode !== "text" || textContent !== null) return;
    setGeneratingText(true);
    fetch("/api/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.segments) {
          const joined = data.segments.map((s: any) => `**${data.title ?? ""}**\n\n${s.text}`).join("\n\n---\n\n");
          setTextContent(joined);
        }
      })
      .finally(() => setGeneratingText(false));
  }, [mode, question, textContent]);

  // Mindmap mode: generate mermaid
  useEffect(() => {
    if (mode !== "mindmap" || mindmapHtml !== null) return;
    setGeneratingMindmap(true);
    fetch("/api/teacher/generate-mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: question }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data?.mermaidCode) {
          try {
            const mermaid = (await import("mermaid")).default;
            mermaid.initialize({ startOnLoad: false, theme: "base" });
            const id = `lmm_${Date.now()}`;
            const { svg } = await mermaid.render(id, data.mermaidCode);
            setMindmapHtml(svg);
          } catch {
            setMindmapHtml("<p style='color:#aaa'>脑图渲染失败</p>");
          }
        }
      })
      .finally(() => setGeneratingMindmap(false));
  }, [mode, question, mindmapHtml]);

  if (mode === null) {
    // Waiting for hydration
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Mode bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10 bg-gray-900">
        <span className="text-xs text-gray-400 mr-3">学习模式：</span>
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => changeMode(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              mode === m.key
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:bg-white/10"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mode === "audio" && <LessonPlayer question={question} />}

      {mode === "text" && (
        <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-6 py-8">
          {generatingText ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-gray-400">正在生成文字版讲义…</p>
            </div>
          ) : textContent ? (
            <div className="space-y-6">
              {textContent.split("\n---\n").map((section, i) => {
                const lines = section.trim().split("\n\n");
                const heading = lines[0]?.replace(/^\*\*|\*\*$/g, "") ?? "";
                const body = lines.slice(1).join("\n\n");
                return (
                  <div key={i} className="bg-gray-800 rounded-2xl p-6 space-y-3">
                    {heading && <h3 className="text-lg font-semibold text-white">{heading}</h3>}
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{body}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">内容加载失败，请刷新重试</p>
          )}
        </div>
      )}

      {mode === "mindmap" && (
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center">
          {generatingMindmap ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-gray-400">正在绘制知识脑图…</p>
            </div>
          ) : mindmapHtml ? (
            <div
              className="bg-white rounded-2xl p-6 max-w-3xl w-full overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: mindmapHtml }}
            />
          ) : (
            <p className="text-gray-400 text-center py-10">脑图加载失败，请刷新重试</p>
          )}
        </div>
      )}
    </div>
  );
}
