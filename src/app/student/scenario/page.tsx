"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SCENARIOS } from "@/lib/scenarios";
import { supabase } from "@/lib/supabase";

interface ThemeRow {
  id: string;
  title: string;
  subject: string;
  subject_icon: string;
  era: string;
  role_name: string;
  narrator_name: string;
  difficulty: string;
  description: string;
  chapters_hint: number;
}

interface SaveRow {
  id: string;
  scenario_id: string;
  save_name: string;
  chapter_index: number;
  completed: boolean;
  created_at: string;
  report_json: any;
}

interface DisplayTheme {
  id: string;
  title: string;
  subject: string;
  subjectIcon: string;
  era: string;
  role: string;
  narratorName: string;
  difficulty: string;
  description: string;
  chaptersHint: number;
  isBuiltIn: boolean;
}

const difficultyColors: Record<string, string> = {
  初级: "bg-green-100 text-green-700",
  中级: "bg-yellow-100 text-yellow-700",
  高级: "bg-red-100 text-red-700",
};

export default function ScenarioCatalogPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const studentId = (session?.user as any)?.id;

  const [allThemes, setAllThemes] = useState<DisplayTheme[]>([]);
  const [selectedId, setSelectedId] = useState<string>("zhenghe");
  const [saves, setSaves] = useState<SaveRow[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [viewReport, setViewReport] = useState<{ save: SaveRow } | null>(null);

  // Load built-in + teacher themes
  useEffect(() => {
    const builtIn: DisplayTheme[] = SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject,
      subjectIcon: s.subjectIcon,
      era: s.era,
      role: s.role,
      narratorName: s.narratorName,
      difficulty: s.difficulty,
      description: s.description,
      chaptersHint: s.chaptersHint,
      isBuiltIn: true,
    }));

    fetch("/api/teacher/scenario-themes")
      .then((r) => r.json())
      .then((data: ThemeRow[]) => {
        const teacherThemes: DisplayTheme[] = (Array.isArray(data) ? data : []).map((t) => ({
          id: t.id,
          title: t.title,
          subject: t.subject,
          subjectIcon: t.subject_icon,
          era: t.era,
          role: t.role_name,
          narratorName: t.narrator_name,
          difficulty: t.difficulty,
          description: t.description || "",
          chaptersHint: t.chapters_hint,
          isBuiltIn: false,
        }));
        setAllThemes([...builtIn, ...teacherThemes]);
      })
      .catch(() => setAllThemes(builtIn));
  }, []);

  // Load saves for the selected theme + current student
  const loadSaves = useCallback(async (themeId: string) => {
    if (!studentId) return;
    setLoadingSaves(true);
    const { data } = await supabase
      .from("scenario_sessions")
      .select("id, scenario_id, save_name, chapter_index, completed, created_at, report_json")
      .eq("student_id", studentId)
      .eq("scenario_id", themeId)
      .order("created_at", { ascending: false });
    setSaves(data ?? []);
    setLoadingSaves(false);
  }, [studentId]);

  useEffect(() => {
    if (selectedId) loadSaves(selectedId);
  }, [selectedId, loadSaves]);

  const selectedTheme = allThemes.find((t) => t.id === selectedId);

  const handleNewSave = async () => {
    if (!studentId || !selectedId || startingNew) return;
    setStartingNew(true);
    try {
      const res = await fetch("/api/student/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", scenarioId: selectedId, studentId }),
      });
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/student/scenario/${selectedId}?session=${data.sessionId}`);
      }
    } finally {
      setStartingNew(false);
    }
  };

  const handleResume = (save: SaveRow) => {
    router.push(`/student/scenario/${selectedId}?session=${save.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10">
        <h1 className="text-3xl font-bold text-white">时空助教 ChronoCo-pilot</h1>
        <p className="text-slate-400 mt-1">穿越历史，亲历那些改变世界的抉择</p>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-auto">
        {/* ── Left/Main: Selected theme details + saves ──────────────────── */}
        <div className="flex-1 px-8 py-6 flex flex-col gap-6 min-w-0">
          {selectedTheme ? (
            <>
              {/* Theme card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-white font-bold text-2xl">
                      {selectedTheme.subjectIcon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">{selectedTheme.title}</h2>
                        {!selectedTheme.isBuiltIn && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            教师创建
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">{selectedTheme.subject} · {selectedTheme.era}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${difficultyColors[selectedTheme.difficulty] ?? "bg-slate-500/20 text-slate-300"}`}>
                    {selectedTheme.difficulty}
                  </span>
                </div>

                <div className="text-sm text-slate-300 space-y-1">
                  <p>🎭 扮演角色：{selectedTheme.role}</p>
                  <p>🗣️ 旁白：{selectedTheme.narratorName} &nbsp;·&nbsp; {selectedTheme.chaptersHint} 章</p>
                </div>

                {selectedTheme.description && (
                  <p className="text-slate-400 text-sm">{selectedTheme.description}</p>
                )}

                <button
                  disabled={startingNew || !session}
                  onClick={handleNewSave}
                  className="mt-1 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {startingNew ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在开启时空之门…
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      开启新存档
                    </>
                  )}
                </button>
              </div>

              {/* Saves list */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">我的存档</p>
                {loadingSaves ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                    <div className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
                    加载存档…
                  </div>
                ) : saves.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm border border-white/5 rounded-2xl bg-white/3">
                    <p>还没有存档</p>
                    <p className="mt-1 text-slate-600">点击「开启新存档」开始第一次冒险</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {saves.map((save) => (
                      <div
                        key={save.id}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${save.completed ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                            {save.completed ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {save.save_name || `存档 ${save.id.slice(0, 6)}`}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {save.completed
                                ? `已完成 · ${save.report_json?.score != null ? `得分 ${save.report_json.score}` : "查看报告"}`
                                : `进行中 · 第 ${save.chapter_index + 1} 章`}
                              {" · "}
                              {new Date(save.created_at).toLocaleDateString("zh-CN")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {save.completed ? (
                            <button
                              onClick={() => setViewReport({ save })}
                              className="px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg transition"
                            >
                              查看报告
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResume(save)}
                              className="px-3 py-1.5 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition"
                            >
                              继续游戏
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-500">
              <p>从右侧选择一个主题开始冒险</p>
            </div>
          )}
        </div>

        {/* ── Right: Theme selector panel ─────────────────────────────────── */}
        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 px-5 py-6 flex flex-col gap-4 overflow-y-auto">
          <p className="text-slate-400 text-xs uppercase tracking-widest">选择主题</p>

          {/* Built-in themes */}
          <div>
            <p className="text-slate-600 text-xs mb-2">内置</p>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-3 rounded-xl mb-2 border transition ${
                  selectedId === s.id
                    ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                    : "bg-white/3 border-white/5 text-slate-300 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center text-sm font-bold text-indigo-300 flex-shrink-0">
                    {s.subjectIcon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-slate-500 truncate">{s.subject} · {s.difficulty}</p>
                  </div>
                  {selectedId === s.id && (
                    <svg className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Teacher themes */}
          {allThemes.filter((t) => !t.isBuiltIn).length > 0 && (
            <div>
              <p className="text-slate-600 text-xs mb-2">教师主题</p>
              {allThemes
                .filter((t) => !t.isBuiltIn)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3 rounded-xl mb-2 border transition ${
                      selectedId === t.id
                        ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                        : "bg-white/3 border-white/5 text-slate-300 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center text-sm font-bold text-purple-300 flex-shrink-0">
                        {t.subjectIcon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 truncate">{t.subject} · {t.difficulty}</p>
                      </div>
                      {selectedId === t.id && (
                        <svg className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}

          {allThemes.filter((t) => !t.isBuiltIn).length === 0 && allThemes.length > 0 && (
            <p className="text-slate-600 text-xs text-center py-4">教师还未添加自定义主题</p>
          )}
        </div>
      </div>

      {/* ── Report Modal ──────────────────────────────────────────────────── */}
      {viewReport && viewReport.save.report_json && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold">Reality Sync 报告</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  {viewReport.save.save_name} · {new Date(viewReport.save.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <button
                onClick={() => setViewReport(null)}
                className="text-slate-500 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Score */}
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-amber-400">{viewReport.save.report_json.score}</span>
                  <span className="text-xs text-amber-500/70">分</span>
                </div>
              </div>
              {[
                { label: "你的走向", key: "student_outcome", color: "border-indigo-500/30 bg-indigo-500/10" },
                { label: "真实历史", key: "real_history", color: "border-green-500/30 bg-green-500/10" },
                { label: "核心差异", key: "key_difference", color: "border-amber-500/30 bg-amber-500/10" },
                { label: "反思建议", key: "reflection", color: "border-purple-500/30 bg-purple-500/10" },
              ].map(({ label, key, color }) => (
                <div key={key} className={`rounded-xl p-4 border ${color}`}>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-slate-200 text-sm leading-relaxed">{viewReport.save.report_json[key]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
