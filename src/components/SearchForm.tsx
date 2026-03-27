"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  clearLessonHistory,
  getLessonHistory,
  LessonDifficulty,
  LessonHistoryItem,
  saveLessonHistory,
} from "@/lib/lessonHistory";

const difficultyLabelMap: Record<LessonDifficulty, string> = {
  preview: "预习",
  review: "复习",
  advanced: "拔高",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SearchForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [textbook, setTextbook] = useState("");
  const [chapter, setChapter] = useState("");
  const [knowledgePoint, setKnowledgePoint] = useState("");
  const [note, setNote] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [difficulty, setDifficulty] = useState<"preview" | "review" | "advanced">("review");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<LessonHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getLessonHistory());
  }, []);

  const canSubmit = useMemo(
    () => Boolean(knowledgePoint.trim() || note.trim() || sourceText.trim()),
    [knowledgePoint, note, sourceText]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    const res = await fetch("/api/lesson/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        textbook,
        chapter,
        knowledgePoint,
        note,
        sourceText,
        difficulty,
      }),
    });
    if (!res.ok) {
      setIsLoading(false);
      return;
    }
    const data = await res.json();
    if (!data?.lessonUrl) {
      setIsLoading(false);
      return;
    }

    const title =
      knowledgePoint.trim() ||
      note.trim() ||
      (sourceText.trim() ? `${sourceText.trim().slice(0, 20)}...` : "学习专题");
    const nextHistory = saveLessonHistory({
      lessonUrl: data.lessonUrl,
      title,
      subject: subject.trim() || undefined,
      chapter: chapter.trim() || undefined,
      difficulty,
    });
    setHistory(nextHistory);
    router.push(data.lessonUrl);
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] gap-6">
      <form onSubmit={handleSubmit} className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-white text-lg font-semibold">创建新微课</h2>
          <p className="text-gray-400 text-sm mt-1">填写核心信息后即可生成，支持长文本材料。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="学科（如数学）" className="bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50" />
          <input value={textbook} onChange={(e) => setTextbook(e.target.value)} placeholder="教材（如人教版高中数学1）" className="bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50" />
          <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="章节（如第五章第一节）" className="bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input value={knowledgePoint} onChange={(e) => setKnowledgePoint(e.target.value)} placeholder="知识点（如双曲线）" className="bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（如中点弦问题）" className="bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50" />
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as "preview" | "review" | "advanced")}
          className="w-full bg-slate-950/60 text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50"
        >
          <option value="preview" style={{ color: "#111827" }}>预习</option>
          <option value="review" style={{ color: "#111827" }}>复习</option>
          <option value="advanced" style={{ color: "#111827" }}>拔高</option>
        </select>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="可粘贴一大段教材正文、讲义、知识点说明（支持长文本）"
          rows={7}
          disabled={isLoading}
          className="w-full bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none disabled:opacity-50 resize-y focus:border-indigo-400/50"
        />
        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              正在生成微课
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              生成微课
            </>
          )}
        </button>

        <div className="pt-1">
          <div className="text-xs text-gray-500 mb-2">常用模板</div>
          <div className="flex flex-wrap gap-2">
            {[
              { kp: "双曲线", noteText: "中点弦问题", diff: "review" as const },
              { kp: "导数", noteText: "切线与单调性", diff: "preview" as const },
              { kp: "函数零点", noteText: "参数分类讨论", diff: "advanced" as const },
            ].map((example) => (
              <button
                key={example.kp + example.noteText}
                type="button"
                onClick={() => {
                  setKnowledgePoint(example.kp);
                  setNote(example.noteText);
                  setDifficulty(example.diff);
                }}
                className="px-3 py-1.5 text-sm text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-200"
              >
                {example.kp} · {example.noteText}
              </button>
            ))}
          </div>
        </div>
      </form>

      <aside className="bg-slate-900/55 border border-white/10 rounded-2xl p-4 flex flex-col min-h-[360px]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">历史微课</h3>
            <p className="text-xs text-gray-500 mt-0.5">保存你之前生成的微课入口</p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearLessonHistory();
                setHistory([]);
              }}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              清空
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex-1 rounded-xl border border-dashed border-white/10 text-gray-500 text-sm flex items-center justify-center px-6 text-center">
            暂无历史微课。生成后会自动出现在这里。
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(item.lessonUrl)}
                className="w-full text-left p-3 rounded-xl border border-white/10 bg-slate-950/40 hover:border-indigo-400/40 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {difficultyLabelMap[item.difficulty]}
                      {item.subject ? ` · ${item.subject}` : ""}
                      {item.chapter ? ` · ${item.chapter}` : ""}
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 whitespace-nowrap">{formatTime(item.createdAt)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
