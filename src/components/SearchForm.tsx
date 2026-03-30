"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  clearLessonHistory,
  getLessonHistory,
  LessonHistoryItem,
  saveLessonHistory,
} from "@/lib/lessonHistory";

interface Option { id: number; name: string }

// 已完整录入课程体系的学科
const DEVELOPED_SUBJECTS = new Set(["高中化学", "高中生物学"]);

const selectCls =
  "w-full bg-slate-950/60 text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50 disabled:opacity-40 disabled:cursor-not-allowed";

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

  // --- 级联选择状态 ---
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [textbooks, setTextbooks] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [points, setPoints] = useState<Option[]>([]);

  const [subjectId, setSubjectId] = useState<string>("");
  const [textbookId, setTextbookId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [pointId, setPointId] = useState<string>("");

  // 显示名（提交给后端）
  const [subjectName, setSubjectName] = useState("");
  const [textbookName, setTextbookName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [pointName, setPointName] = useState("");

  const [sourceText, setSourceText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<LessonHistoryItem[]>([]);

  // 当前选中学科是否已开发
  const isDeveloped = DEVELOPED_SUBJECTS.has(subjectName);

  // 加载历史
  useEffect(() => { setHistory(getLessonHistory()); }, []);

  // 加载学科列表
  useEffect(() => {
    fetch("/api/lesson/curriculum?level=subjects")
      .then((r) => r.json())
      .then(setSubjects)
      .catch(() => {});
  }, []);

  // 切换学科 → 清空下游
  const handleSubjectChange = (id: string) => {
    const found = subjects.find((s) => String(s.id) === id);
    setSubjectId(id);
    setSubjectName(found?.name ?? "");
    setTextbooks([]); setTextbookId(""); setTextbookName("");
    setChapters([]);  setChapterId("");  setChapterName("");
    setPoints([]);    setPointId("");    setPointName("");
    if (!id) return;
    fetch(`/api/lesson/curriculum?level=textbooks&subjectId=${id}`)
      .then((r) => r.json())
      .then(setTextbooks)
      .catch(() => {});
  };

  // 切换教材 → 清空下游
  const handleTextbookChange = (id: string) => {
    const found = textbooks.find((t) => String(t.id) === id);
    setTextbookId(id);
    setTextbookName(found?.name ?? "");
    setChapters([]); setChapterId(""); setChapterName("");
    setPoints([]);   setPointId("");   setPointName("");
    if (!id) return;
    fetch(`/api/lesson/curriculum?level=chapters&textbookId=${id}`)
      .then((r) => r.json())
      .then(setChapters)
      .catch(() => {});
  };

  // 切换章节 → 清空下游
  const handleChapterChange = (id: string) => {
    const found = chapters.find((c) => String(c.id) === id);
    setChapterId(id);
    setChapterName(found?.name ?? "");
    setPoints([]);  setPointId("");  setPointName("");
    if (!id) return;
    fetch(`/api/lesson/curriculum?level=points&chapterId=${id}`)
      .then((r) => r.json())
      .then(setPoints)
      .catch(() => {});
  };

  const handlePointChange = (id: string) => {
    const found = points.find((p) => String(p.id) === id);
    setPointId(id);
    setPointName(found?.name ?? "");
  };

  const canSubmit = Boolean(pointName.trim() || sourceText.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    const res = await fetch("/api/lesson/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subjectName,
        textbook: textbookName,
        chapter: chapterName,
        knowledgePoint: pointName,
        sourceText,
      }),
    });
    if (!res.ok) { setIsLoading(false); return; }
    const data = await res.json();
    if (!data?.lessonUrl) { setIsLoading(false); return; }

    const title = pointName.trim() || (sourceText.trim() ? `${sourceText.trim().slice(0, 20)}...` : "学习专题");
    const nextHistory = saveLessonHistory({
      lessonUrl: data.lessonUrl,
      title,
      subject: subjectName || undefined,
      chapter: chapterName || undefined,
      difficulty: "review",
    });
    setHistory(nextHistory);
    router.push(data.lessonUrl);
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] gap-6">
      <form onSubmit={handleSubmit} className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-white text-lg font-semibold">创建新课程</h2>
          <p className="text-gray-400 text-sm mt-1">逐级选择学科信息，选定知识点后即可生成讲解。</p>
        </div>

        {/* 学科 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">学科</label>
          <select value={subjectId} onChange={(e) => handleSubjectChange(e.target.value)} className={selectCls}>
            <option value="" style={{ color: "#9ca3af" }}>请选择学科</option>
            {subjects.map((s) => (
              <option key={s.id} value={String(s.id)} style={{ color: "#111827" }}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 待开发提示 */}
        {subjectId && !isDeveloped && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            该学科课程体系正在建设中，敬请期待
          </div>
        )}

        {/* 教材（仅已开发学科展示） */}
        {isDeveloped && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">教材</label>
            <select value={textbookId} onChange={(e) => handleTextbookChange(e.target.value)} className={selectCls}>
              <option value="" style={{ color: "#9ca3af" }}>请选择教材</option>
              {textbooks.map((t) => (
                <option key={t.id} value={String(t.id)} style={{ color: "#111827" }}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 章节 */}
        {isDeveloped && textbookId && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">章节</label>
            <select value={chapterId} onChange={(e) => handleChapterChange(e.target.value)} className={selectCls} disabled={chapters.length === 0}>
              <option value="" style={{ color: "#9ca3af" }}>{chapters.length === 0 ? "暂无数据" : "请选择章节"}</option>
              {chapters.map((c) => (
                <option key={c.id} value={String(c.id)} style={{ color: "#111827" }}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 知识点 */}
        {isDeveloped && chapterId && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">知识点</label>
            <select value={pointId} onChange={(e) => handlePointChange(e.target.value)} className={selectCls} disabled={points.length === 0}>
              <option value="" style={{ color: "#9ca3af" }}>{points.length === 0 ? "暂无数据" : "请选择知识点"}</option>
              {points.map((p) => (
                <option key={p.id} value={String(p.id)} style={{ color: "#111827" }}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 补充材料 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">补充材料（可选）</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="可粘贴教材正文、讲义、知识点说明（支持长文本）"
            rows={5}
            disabled={isLoading}
            className="w-full bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none disabled:opacity-50 resize-y focus:border-indigo-400/50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              正在生成课程
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              生成课程
            </>
          )}
        </button>
      </form>

      <aside className="bg-slate-900/55 border border-white/10 rounded-2xl p-4 flex flex-col min-h-[360px]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">历史课程</h3>
            <p className="text-xs text-gray-500 mt-0.5">保存你之前生成的课程入口</p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => { clearLessonHistory(); setHistory([]); }}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              清空
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex-1 rounded-xl border border-dashed border-white/10 text-gray-500 text-sm flex items-center justify-center px-6 text-center">
            暂无历史课程。生成后会自动出现在这里。
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
                      {item.subject ? item.subject : ""}
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
