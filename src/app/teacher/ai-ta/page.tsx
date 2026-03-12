"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";

interface AiAssistant {
  id: string;
  class_id: string;
  subject: string;
  name: string;
  avatar_emoji: string;
  system_prompt: string;
  knowledge_text: string;
  created_at: string;
}

interface ClassRow {
  id: string;
  name: string;
}

const EMOJI_PRESETS = ["TA", "AI", "老师", "助手", "数学", "英语", "物理", "化学", "历史", "语文"];

const DEFAULT_FORM = {
  class_id: "",
  subject: "",
  name: "",
  avatar_emoji: "TA",
  system_prompt: "",
  knowledge_text: "",
};

export default function AiTaConfigPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? "";

  const [assistants, setAssistants] = useState<AiAssistant[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadAssistants = async () => {
    const res = await fetch("/api/teacher/ai-ta");
    const data = await res.json();
    setAssistants(data.assistants ?? []);
  };

  useEffect(() => {
    if (!userId) return;
    // Load classes for this teacher
    supabase
      .from("teacher_classes")
      .select("class_id, classes(id, name)")
      .eq("teacher_id", userId)
      .then(({ data }) => {
        const rows = (data ?? []).map((d: any) => ({ id: d.class_id, name: d.classes?.name ?? d.class_id }));
        setClasses(rows);
      });
    loadAssistants();
  }, [userId]);

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (a: AiAssistant) => {
    setForm({
      class_id: a.class_id,
      subject: a.subject ?? "",
      name: a.name,
      avatar_emoji: a.avatar_emoji ?? "TA",
      system_prompt: a.system_prompt ?? "",
      knowledge_text: a.knowledge_text ?? "",
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.class_id || !form.name) return;
    setSaving(true);
    const method = editId ? "PUT" : "POST";
    const body = editId ? { ...form, id: editId } : form;
    await fetch("/api/teacher/ai-ta", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setShowForm(false);
    loadAssistants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个 AI TA 吗？")) return;
    setDeleting(id);
    await fetch("/api/teacher/ai-ta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    loadAssistants();
  };

  const className = (classId: string) => classes.find((c) => c.id === classId)?.name ?? classId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>专属 AI TA 配置</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>为每个班级配置专属的 AI 学习助手，学生将使用你设定的角色与知识库</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition"
        >
          + 新建 AI TA
        </button>
      </div>

      {/* List */}
      {assistants.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
          <p className="text-4xl mb-3 font-bold" style={{ color: "var(--muted)" }}>TA</p>
          <p className="text-sm">还没有创建 AI TA，点击上方「新建」开始吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assistants.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl p-5 border space-y-3"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {(a.avatar_emoji || a.name).slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>{a.name}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {className(a.class_id)} · {a.subject || "通用"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(a)}
                    className="px-3 py-1 text-xs border rounded-lg transition hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    className="px-3 py-1 text-xs border rounded-lg transition text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  >
                    {deleting === a.id ? "…" : "删除"}
                  </button>
                </div>
              </div>
              {a.system_prompt && (
                <p className="text-xs rounded-lg px-3 py-2 line-clamp-2" style={{ background: "var(--background)", color: "var(--muted)" }}>
                  {a.system_prompt}
                </p>
              )}
              {a.knowledge_text && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  知识库：{a.knowledge_text.slice(0, 60)}…
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" style={{ background: "var(--card)" }}>
            <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              {editId ? "编辑 AI TA" : "新建 AI TA"}
            </h2>

            {/* Emoji picker */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: "var(--foreground)" }}>头像</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setForm((f) => ({ ...f, avatar_emoji: e }))}
                    className={`px-3 py-1.5 text-sm rounded-xl border-2 transition font-medium ${form.avatar_emoji === e ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-transparent hover:border-gray-300"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name + Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>TA 名称 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="如：小智老师"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>学科</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="如：数学、物理"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                />
              </div>
            </div>

            {/* Class selector */}
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>绑定班级 *</label>
              <select
                value={form.class_id}
                onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              >
                <option value="">请选择班级</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* System prompt */}
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>
                角色设定（System Prompt）
              </label>
              <textarea
                value={form.system_prompt}
                onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                rows={4}
                placeholder="例如：你是一位专注于数学的 AI 家教，擅长用实例讲解抽象概念，语气轻松活泼…"
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
                style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              />
            </div>

            {/* Knowledge text */}
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>
                知识库（粘贴讲义/笔记，学生提问时 AI 会优先参考）
              </label>
              <textarea
                value={form.knowledge_text}
                onChange={(e) => setForm((f) => ({ ...f, knowledge_text: e.target.value }))}
                rows={5}
                placeholder="粘贴课程笔记、重点知识点、例题等…"
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
                style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg"
                style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.class_id || !form.name}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
