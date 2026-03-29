"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SCENARIOS } from "@/lib/scenarios";

interface ThemeRow {
  id: string;
  teacher_id: string;
  title: string;
  subject: string;
  subject_icon: string;
  era: string;
  role_name: string;
  narrator_name: string;
  difficulty: string;
  description: string;
  background: string;
  real_history: string;
  chapters_hint: number;
  created_at: string;
}

const difficultyColor: Record<string, string> = {
  初级: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  中级: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  高级: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const DIFFICULTIES = ["初级", "中级", "高级"];
const CHAPTER_OPTIONS = [3, 4, 5, 6, 7, 8];

const emptyForm = {
  title: "",
  subject: "历史",
  subject_icon: "历",
  era: "",
  role_name: "",
  narrator_name: "",
  difficulty: "中级",
  description: "",
  background: "",
  real_history: "",
  chapters_hint: 5,
};

export default function ScenarioThemesPage() {
  const { data: session } = useSession();
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const teacherId = (session?.user as any)?.id;

  const loadThemes = async () => {
    setLoading(true);
    const res = await fetch("/api/teacher/scenario-themes");
    const data = await res.json();
    setThemes(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadThemes(); }, []);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.era || !form.role_name || !form.narrator_name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/scenario-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teacherId }),
      });
      if (res.ok) {
        setShowModal(false);
        await loadThemes();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/teacher/scenario-themes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setDeleteId(null);
      await loadThemes();
    }
  };

  const field = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">时空助教 — 主题管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            创建自定义游戏主题，学生可在时空助教中选择并游玩
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建主题
        </button>
      </div>

      {/* Built-in theme (read-only) */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">内置主题</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIOS.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                    {s.subjectIcon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{s.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.subject}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  内置
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>{s.era}</p>
                <p>角色：{s.role} &nbsp;·&nbsp; 旁白：{s.narratorName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[s.difficulty]}`}>
                  {s.difficulty}
                </span>
                <span className="text-xs text-gray-400">{s.chaptersHint} 章</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher-created themes */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          教师主题 {themes.length > 0 ? `(${themes.length})` : ""}
        </p>
        {loading ? (
          <p className="text-gray-400 text-sm">加载中…</p>
        ) : themes.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <p className="mb-2">还没有自定义主题</p>
            <button onClick={openCreate} className="text-indigo-500 hover:underline">
              创建第一个主题 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                      {t.subject_icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{t.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.subject}</p>
                    </div>
                  </div>
                  {deleteId === t.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">确认删除？</span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(t.id)}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="删除主题"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <p>{t.era}</p>
                  <p>角色：{t.role_name} &nbsp;·&nbsp; 旁白：{t.narrator_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[t.difficulty] ?? difficultyColor["中级"]}`}>
                    {t.difficulty}
                  </span>
                  <span className="text-xs text-gray-400">{t.chapters_hint} 章</span>
                  <span className="text-xs text-gray-400">
                    {new Date(t.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                {t.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">创建新主题</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  主题标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => field("title", e.target.value)}
                  placeholder="例：大明航海志·郑和篇"
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Subject & Icon */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    科目标识
                  </label>
                  <input
                    type="text"
                    value={form.subject_icon}
                    onChange={(e) => field("subject_icon", e.target.value.slice(0, 2))}
                    placeholder="历"
                    maxLength={2}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    科目名称
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => field("subject", e.target.value)}
                    placeholder="例：历史、语文、地理"
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Era */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  时代背景 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.era}
                  onChange={(e) => field("era", e.target.value)}
                  placeholder="例：明朝永乐年间（公元1405年）"
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Roles */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    学生扮演角色 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.role_name}
                    onChange={(e) => field("role_name", e.target.value)}
                    placeholder="例：郑和船队副统领"
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    旁白角色 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.narrator_name}
                    onChange={(e) => field("narrator_name", e.target.value)}
                    placeholder="例：副舰长林海"
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Difficulty & Chapters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">难度</label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d}
                        onClick={() => field("difficulty", d)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition ${
                          form.difficulty === d
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">章节数</label>
                  <select
                    value={form.chapters_hint}
                    onChange={(e) => field("chapters_hint", Number(e.target.value))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CHAPTER_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n} 章</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">简介</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                  placeholder="一句话介绍主题内容"
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Background */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  故事背景与教学目标 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">AI 将依据此内容构建游戏情节与决策场景</p>
                <textarea
                  value={form.background}
                  onChange={(e) => field("background", e.target.value)}
                  placeholder="描述历史情境、核心事件、学生需要做出的决策类型，以及本主题的教学目标……"
                  rows={4}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Real History */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  历史史实参考
                </label>
                <p className="text-xs text-gray-400 mb-1">游戏结束后用于生成"历史对比"报告</p>
                <textarea
                  value={form.real_history}
                  onChange={(e) => field("real_history", e.target.value)}
                  placeholder="列出本主题的真实历史事件、结果与意义……"
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
              >
                取消
              </button>
              <button
                disabled={saving || !form.title || !form.era || !form.role_name || !form.narrator_name || !form.background}
                onClick={handleSubmit}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {saving ? "创建中…" : "创建主题"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
