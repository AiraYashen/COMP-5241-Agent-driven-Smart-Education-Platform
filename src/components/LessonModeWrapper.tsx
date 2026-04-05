"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LessonPlayer from "@/components/LessonPlayer";
import { normalizeMermaidCode } from "@/lib/mermaid";
import { readLessonCache, writeLessonCache } from "@/lib/lessonCache";

type Mode = "audio" | "text" | "mindmap";

const MODES: { key: Mode; label: string }[] = [
  { key: "audio", label: "演讲模式" },
  { key: "text", label: "阅读模式" },
  { key: "mindmap", label: "脑图模式" },
];

interface Props {
  question: string;
  sid?: string;
}

interface LessonModeCache {
  textContent: string | null;
  mindmapHtml: string | null;
}

export default function LessonModeWrapper({ question, sid }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [mindmapHtml, setMindmapHtml] = useState<string | null>(null);
  const [generatingText, setGeneratingText] = useState(false);
  const [generatingMindmap, setGeneratingMindmap] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const lessonCacheKey = useMemo(
    () => `lesson_mode_cache:${sid?.trim() ? `sid:${sid}` : `q:${question}`}`,
    [question, sid]
  );

  // Restore text/mindmap cache to avoid repeated requests on remount/history revisit
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cache = readLessonCache<LessonModeCache>(lessonCacheKey);
      if (!cache) return;
      if (typeof cache.textContent === "string") setTextContent(cache.textContent);
      if (typeof cache.mindmapHtml === "string") setMindmapHtml(cache.mindmapHtml);
    } catch {
      // ignore invalid cache
    }
  }, [lessonCacheKey]);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lesson_mode") as Mode | null;
    setMode(stored ?? "audio");
  }, []);

  const changeMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem("lesson_mode", m);
  };

  // Persist generated text/mindmap cache
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (textContent === null && mindmapHtml === null) return;
    const cache: LessonModeCache = { textContent, mindmapHtml };
    writeLessonCache(lessonCacheKey, cache);
  }, [lessonCacheKey, textContent, mindmapHtml]);

  // Text mode: generate lesson text without audio
  useEffect(() => {
    if (mode !== "text" || textContent !== null) return;
    setGeneratingText(true);
    fetch("/api/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, sid }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "内容生成失败");
        return data;
      })
      .then((data) => {
        if (data?.segments) {
          const joined = data.segments.map((s: any) => `**${data.title ?? ""}**\n\n${s.text}`).join("\n\n---\n\n");
          setTextContent(joined);
        }
      })
      .catch((err: Error) => setTextContent(err.message))
      .finally(() => setGeneratingText(false));
  }, [mode, question, sid, textContent]);

  // Mindmap mode: generate mermaid
  useEffect(() => {
    if (mode !== "mindmap" || mindmapHtml !== null) return;
    setGeneratingMindmap(true);
    fetch("/api/teacher/generate-mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: question, sid }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "脑图生成失败");
        return data;
      })
      .then(async (data) => {
        if (data?.code) {
          try {
            const mermaid = (await import("mermaid")).default;
            mermaid.initialize({ startOnLoad: false, theme: "base" });
            const id = `lmm_${Date.now()}`;
            const code = normalizeMermaidCode(String(data.code ?? ""));
            const { svg } = await mermaid.render(id, code);
            setMindmapHtml(svg);
          } catch {
            setMindmapHtml("<p style='color:#aaa'>脑图渲染失败</p>");
          }
        }
      })
      .catch((err: Error) => setMindmapHtml(`<p style='color:#aaa'>${err.message}</p>`))
      .finally(() => setGeneratingMindmap(false));
  }, [mode, question, sid, mindmapHtml]);

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
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 mr-3 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回上一级
        </button>
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
      {mode === "audio" && <LessonPlayer question={question} sid={sid} />}

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
                const titleLine = lines[0]?.replace(/^\*\*|\*\*$/g, "") ?? "";
                
                let heading = "";
                let body = "";
                
                if (i === 0) {
                  // First section: use the main title, content is lines[1:]
                  heading = titleLine;
                  body = lines.slice(1).join("\n\n");
                } else {
                  // Subsequent sections: skip the repeated title line, generate heading from actual content
                  // The first line is the repeated title, skip it
                  const contentLines = lines.slice(1); // Skip the repeated title
                  const fullContent = contentLines.join("\n\n");
                  
                  // Extract meaningful heading from content: first sentence (up to 30 chars)
                  const sentences = fullContent.split(/[。！？]/);
                  const firstSentence = sentences[0]?.trim().slice(0, 35) || `段落 ${i + 1}`;
                  heading = firstSentence.length > 2 ? firstSentence : `段落 ${i + 1}`;
                  body = fullContent;
                }
                
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
