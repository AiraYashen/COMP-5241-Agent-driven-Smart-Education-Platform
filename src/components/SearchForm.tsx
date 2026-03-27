"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!knowledgePoint.trim() && !note.trim() && !sourceText.trim()) return;
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
    if (data?.lessonUrl) router.push(data.lessonUrl);
    else setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500" />
        <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="学科（如数学）" className="bg-transparent text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none" />
            <input value={textbook} onChange={(e) => setTextbook(e.target.value)} placeholder="教材（如人教版高中数学1）" className="bg-transparent text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none" />
            <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="章节（如第五章第一节）" className="bg-transparent text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={knowledgePoint} onChange={(e) => setKnowledgePoint(e.target.value)} placeholder="知识点（如双曲线）" className="bg-transparent text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（如中点弦问题）" className="bg-transparent text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none" />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as "preview" | "review" | "advanced")}
            className="w-full bg-transparent text-white px-3 py-2 rounded-lg border border-white/10 outline-none"
          >
            <option value="preview" style={{ color: "#111827" }}>预习</option>
            <option value="review" style={{ color: "#111827" }}>复习</option>
            <option value="advanced" style={{ color: "#111827" }}>拔高</option>
          </select>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="可粘贴一大段教材正文、讲义、知识点说明（支持长文本）"
            rows={6}
            disabled={isLoading}
            className="w-full bg-transparent text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none disabled:opacity-50 resize-y"
          />
          <input
            className="hidden"
            readOnly
            value=""
          />
          <button type="submit" disabled={isLoading || (!knowledgePoint.trim() && !note.trim() && !sourceText.trim())}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2">
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
                生成 AI 微课
              </>
            )}
          </button>
        </div>
      </div>

      {/* 示例模板 */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
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
            className="px-3 py-1.5 text-sm text-gray-400 bg-white/5 hover:bg-white/10 hover:text-gray-200 border border-white/10 rounded-full transition-all duration-200"
          >
            {example.kp} · {example.noteText}
          </button>
        ))}
      </div>
    </form>
  );
}
