"use client";

import { useEffect, useState } from "react";

interface Option { id: number; name: string }
interface PointOption { id: number; name: string; reference_text: string | null }

// 已完整录入课程体系的学科
const DEVELOPED_SUBJECTS = new Set(["高中化学", "高中生物学"]);

const selectCls =
  "w-full bg-slate-950/60 text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-indigo-400/50 disabled:opacity-40 disabled:cursor-not-allowed";

export default function KnowledgeReferencePage() {
  const [subjects, setSubjects]   = useState<Option[]>([]);
  const [textbooks, setTextbooks] = useState<Option[]>([]);
  const [chapters, setChapters]   = useState<Option[]>([]);
  const [points, setPoints]       = useState<PointOption[]>([]);

  const [subjectId, setSubjectId]   = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [textbookId, setTextbookId] = useState("");
  const [chapterId, setChapterId]   = useState("");
  const [pointId, setPointId]       = useState("");
  const [pointName, setPointName]   = useState("");

  const [referenceText, setReferenceText] = useState("");
  const [isSaving, setIsSaving]           = useState(false);
  const [saveMsg, setSaveMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  // 缓存：记录教材/章节是否有下级内容
  const [textbookHasChapters, setTextbookHasChapters] = useState<Map<number, boolean>>(new Map());
  const [chapterHasPoints, setChapterHasPoints] = useState<Map<number, boolean>>(new Map());

  // 当前选中学科是否已开发
  const isDeveloped = DEVELOPED_SUBJECTS.has(subjectName);

  // 当前选中教材是否有下级章节
  const textbookIsDeveloped = textbookId ? textbookHasChapters.get(Number(textbookId)) ?? true : true;

  // 当前选中章节是否有下级知识点
  const chapterIsDeveloped = chapterId ? chapterHasPoints.get(Number(chapterId)) ?? true : true;

  // 加载学科
  useEffect(() => {
    fetch("/api/lesson/curriculum?level=subjects")
      .then((r) => r.json())
      .then(setSubjects)
      .catch(() => {});
  }, []);

  const handleSubjectChange = (id: string) => {
    const found = subjects.find((s) => String(s.id) === id);
    setSubjectId(id);
    setSubjectName(found?.name ?? "");
    setTextbooks([]); setTextbookId("");
    setChapters([]);  setChapterId("");
    setPoints([]);    setPointId(""); setPointName(""); setReferenceText(""); setSaveMsg(null);
    setTextbookHasChapters(new Map());
    setChapterHasPoints(new Map());
    if (!id) return;
    fetch(`/api/lesson/curriculum?level=textbooks&subjectId=${id}`)
      .then((r) => r.json())
      .then((tbs) => {
        setTextbooks(tbs);
        // 预加载所有教材的下级章节，检查是否有内容
        const hasChaptersMap = new Map<number, boolean>();
        tbs.forEach((tb: Option) => {
          fetch(`/api/lesson/curriculum?level=chapters&textbookId=${tb.id}`)
            .then((r) => r.json())
            .then((chps) => {
              hasChaptersMap.set(tb.id, chps.length > 0);
              setTextbookHasChapters(new Map(hasChaptersMap));
            })
            .catch(() => {
              hasChaptersMap.set(tb.id, false);
              setTextbookHasChapters(new Map(hasChaptersMap));
            });
        });
      })
      .catch(() => {});
  };

  const handleTextbookChange = (id: string) => {
    setTextbookId(id);
    setChapters([]); setChapterId("");
    setPoints([]);   setPointId(""); setPointName(""); setReferenceText(""); setSaveMsg(null);
    setChapterHasPoints(new Map());
    if (!id) return;
    fetch(`/api/lesson/curriculum?level=chapters&textbookId=${id}`)
      .then((r) => r.json())
      .then((chps) => {
        setChapters(chps);
        // 预加载所有章节的下级知识点，检查是否有内容
        const hasPointsMap = new Map<number, boolean>();
        chps.forEach((ch: Option) => {
          fetch(`/api/lesson/curriculum?level=points&chapterId=${ch.id}`)
            .then((r) => r.json())
            .then((pts) => {
              hasPointsMap.set(ch.id, pts.length > 0);
              setChapterHasPoints(new Map(hasPointsMap));
            })
            .catch(() => {
              hasPointsMap.set(ch.id, false);
              setChapterHasPoints(new Map(hasPointsMap));
            });
        });
      })
      .catch(() => {});
  };

  const handleChapterChange = (id: string) => {
    setChapterId(id);
    setPoints([]);  setPointId(""); setPointName(""); setReferenceText(""); setSaveMsg(null);
    if (!id) return;
    fetch(`/api/lesson/curriculum?level=points&chapterId=${id}`)
      .then((r) => r.json()).then(setPoints).catch(() => {});
  };

  const handlePointChange = (id: string) => {
    const found = points.find((p) => String(p.id) === id);
    setPointId(id);
    setPointName(found?.name ?? "");
    setReferenceText(found?.reference_text ?? "");
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!pointId) return;
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/teacher/knowledge-reference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointId: Number(pointId), referenceText: referenceText.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      // 同步更新本地 points 缓存
      setPoints((prev) =>
        prev.map((p) =>
          String(p.id) === pointId
            ? { ...p, reference_text: referenceText.trim() || null }
            : p
        )
      );
      setSaveMsg({ ok: true, text: "保存成功" });
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasContent = referenceText.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-gray-400 text-2xl font-bold">口袋课堂参考资料管理</h1>
        <p className="text-gray-400 text-sm mt-1">
          逐级选定知识点，输入 AI 生成课程时的参考教材内容。学生端选中该知识点后将自动使用此资料。
        </p>
      </div>

      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 space-y-4">

        {/* 学科 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">学科</label>
          <select value={subjectId} onChange={(e) => handleSubjectChange(e.target.value)} className={selectCls}>
            <option value="" style={{ color: "#9ca3af" }}>请选择学科</option>
            {subjects.map((s) => {
              const isDev = DEVELOPED_SUBJECTS.has(s.name);
              return (
                <option key={s.id} value={String(s.id)} style={{ color: "#111827" }}>
                  {s.name}{!isDev ? "（待开放）" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* 待建设提示 */}
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
              {textbooks.map((t) => {
                const hasChapters = textbookHasChapters.get(t.id) ?? true; // 默认为true（未检查）
                return (
                  <option key={t.id} value={String(t.id)} style={{ color: "#111827" }}>
                    {t.name}{!hasChapters && textbookHasChapters.has(t.id) ? "（待开放）" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* 教材待建设提示 */}
        {textbookId && !textbookIsDeveloped && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            该教材课程体系正在建设中，敬请期待
          </div>
        )}

        {/* 章节 */}
        {isDeveloped && chapters.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">章节</label>
            <select value={chapterId} onChange={(e) => handleChapterChange(e.target.value)} className={selectCls}>
              <option value="" style={{ color: "#9ca3af" }}>请选择章节</option>
              {chapters.map((c) => {
                const hasPoints = chapterHasPoints.get(c.id) ?? true; // 默认为true（未检查）
                return (
                  <option key={c.id} value={String(c.id)} style={{ color: "#111827" }}>
                    {c.name}{!hasPoints && chapterHasPoints.has(c.id) ? "（待开放）" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* 章节待建设提示 */}
        {chapterId && !chapterIsDeveloped && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            该章节课程体系正在建设中，敬请期待
          </div>
        )}

        {/* 知识点 */}
        {isDeveloped && points.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">知识点</label>
            <select value={pointId} onChange={(e) => handlePointChange(e.target.value)} className={selectCls}>
              <option value="" style={{ color: "#9ca3af" }}>请选择知识点</option>
              {points.map((p) => (
                <option key={p.id} value={String(p.id)} style={{ color: "#111827" }}>
                  {p.name}{p.reference_text ? " ✓" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">选项后带 ✓ 表示已有参考资料</p>
          </div>
        )}

        {/* 参考资料编辑区 */}
        {pointId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs text-gray-400">
                参考资料内容
                <span className="ml-2 text-gray-500">（AI 生成课程时将作为上下文参考）</span>
              </label>
              {hasContent && (
                <span className="text-xs text-emerald-400">{referenceText.trim().length} 字</span>
              )}
            </div>
            <textarea
              value={referenceText}
              onChange={(e) => { setReferenceText(e.target.value); setSaveMsg(null); }}
              placeholder={`请粘贴《${pointName}》的教材原文、知识要点或讲解说明……`}
              rows={12}
              className="w-full bg-slate-950/60 text-white placeholder-gray-500 px-3 py-2 rounded-lg border border-white/10 outline-none resize-y focus:border-indigo-400/50"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中…
                  </>
                ) : "保存"}
              </button>

              {referenceText.trim() && (
                <button
                  type="button"
                  onClick={() => { setReferenceText(""); setSaveMsg(null); }}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  清空
                </button>
              )}

              {saveMsg && (
                <span className={`text-sm ${saveMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {saveMsg.text}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 未选知识点时的提示 */}
        {!pointId && subjectId && (
          <div className="text-center py-6 text-gray-500 text-sm">
            请逐级选择学科 → 教材 → 章节 → 知识点
          </div>
        )}
        {!subjectId && (
          <div className="text-center py-6 text-gray-500 text-sm">
            从学科开始选择，定位到具体知识点后即可编辑参考资料
          </div>
        )}
      </div>
    </div>
  );
}
