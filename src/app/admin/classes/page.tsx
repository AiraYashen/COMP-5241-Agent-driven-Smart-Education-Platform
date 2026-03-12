"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select } from "@/components/ui";

interface Class {
  id: string;
  name: string;
  grade: string | null;
  school_id: string;
  created_at: string;
  schools?: { name: string };
}

interface School {
  id: string;
  name: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Class | null>(null);
  const [form, setForm] = useState({ name: "", grade: "", school_id: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: cls }, { data: sch }] = await Promise.all([
      supabase.from("classes").select("*, schools(name)").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name"),
    ]);
    setClasses(cls ?? []);
    setSchools(sch ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditTarget(null); setForm({ name: "", grade: "", school_id: "" }); setModalOpen(true); };
  const openEdit = (c: Class) => { setEditTarget(c); setForm({ name: c.name, grade: c.grade ?? "", school_id: c.school_id }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.school_id) return;
    setSaving(true);
    if (editTarget) {
      await supabase.from("classes").update({ name: form.name, grade: form.grade, school_id: form.school_id }).eq("id", editTarget.id);
    } else {
      await supabase.from("classes").insert({ name: form.name, grade: form.grade, school_id: form.school_id });
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除该班级？")) return;
    await supabase.from("classes").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>班级管理</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>管理学校班级信息</p>
        </div>
        <Button onClick={openNew}>+ 添加班级</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--foreground)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                {["班级名称", "年级", "所属学校", "创建时间", "操作"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>加载中...</td></tr>
              ) : classes.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>暂无数据</td></tr>
              ) : classes.map((c) => (
                <tr key={c.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-5 py-3.5 font-medium">{c.name}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{c.grade || "—"}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{c.schools?.name || "—"}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{new Date(c.created_at).toLocaleDateString("zh-CN")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>编辑</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)}>删除</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "编辑班级" : "添加班级"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button loading={saving} onClick={handleSave}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="所属学校 *" value={form.school_id} onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}>
            <option value="">-- 选择学校 --</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="班级名称 *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：高三(1)班" />
          <Input label="年级" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} placeholder="如：高三" />
        </div>
      </Modal>
    </div>
  );
}
