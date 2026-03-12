"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input } from "@/components/ui";

interface School {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("schools").select("*").order("created_at", { ascending: false });
    setSchools(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditTarget(null); setForm({ name: "", address: "" }); setModalOpen(true); };
  const openEdit = (s: School) => { setEditTarget(s); setForm({ name: s.name, address: s.address ?? "" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editTarget) {
      await supabase.from("schools").update({ name: form.name, address: form.address }).eq("id", editTarget.id);
    } else {
      await supabase.from("schools").insert({ name: form.name, address: form.address });
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await supabase.from("schools").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>学校管理</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>管理所有学校信息</p>
        </div>
        <Button onClick={openNew}>+ 添加学校</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--foreground)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                {["学校名称", "地址", "创建时间", "操作"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>加载中...</td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>暂无数据</td>
                </tr>
              ) : schools.map((s) => (
                <tr key={s.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-5 py-3.5 font-medium">{s.name}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{s.address || "—"}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{new Date(s.created_at).toLocaleDateString("zh-CN")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>编辑</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}>删除</Button>
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
        title={editTarget ? "编辑学校" : "添加学校"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button loading={saving} onClick={handleSave}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="学校名称 *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="请输入学校名称" />
          <Input label="地址" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="请输入地址（可选）" />
        </div>
      </Modal>
    </div>
  );
}
