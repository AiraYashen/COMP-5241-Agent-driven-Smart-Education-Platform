"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select, Badge } from "@/components/ui";

type Role = "ADMIN" | "TEACHER" | "STUDENT";

interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  school_id: string | null;
  created_at: string;
  schools?: { name: string };
}

interface School {
  id: string;
  name: string;
}

const roleColors: Record<Role, "info" | "warning" | "success"> = {
  ADMIN: "danger" as any,
  TEACHER: "warning",
  STUDENT: "success",
};

const roleLabels: Record<Role, string> = { ADMIN: "管理员", TEACHER: "教师", STUDENT: "学生" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", role: "STUDENT" as Role, school_id: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: u }, { data: s }] = await Promise.all([
      supabase.from("users").select("*, schools(name)").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name"),
    ]);
    setUsers(u ?? []);
    setSchools(s ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) =>
    u.name.includes(search) || u.phone?.includes(search)
  );

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    if (editingUser) {
      await supabase.from("users").update({
        name: form.name,
        phone: form.phone,
        role: form.role,
        school_id: form.school_id || null,
      }).eq("id", editingUser.id);
    } else {
      await supabase.from("users").insert({ name: form.name, phone: form.phone, role: form.role, school_id: form.school_id || null });
    }
    setSaving(false);
    setModalOpen(false);
    setEditingUser(null);
    setForm({ name: "", phone: "", role: "STUDENT", school_id: "" });
    load();
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, phone: u.phone ?? "", role: u.role, school_id: u.school_id ?? "" });
    setModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setForm({ name: "", phone: "", role: "STUDENT", school_id: "" });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除该用户？")) return;
    await supabase.from("users").delete().eq("id", id);
    load();
  };

  const handleRoleChange = async (id: string, role: Role) => {
    await supabase.from("users").update({ role }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>用户管理</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>管理系统用户及角色</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索姓名/手机号..."
            className="px-3 py-2 rounded-lg text-sm border focus:outline-none w-48"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
          />
          <Button onClick={handleOpenAdd}>+ 添加用户</Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--foreground)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                {["姓名", "手机号", "角色", "所属学校", "注册时间", "操作"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>加载中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>暂无数据</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-5 py-3.5 font-medium">{u.name}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{u.phone}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      className="px-2 py-1 rounded text-xs border focus:outline-none"
                      style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
                    >
                      {(["ADMIN", "TEACHER", "STUDENT"] as Role[]).map((r) => (
                        <option key={r} value={r}>{roleLabels[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{u.schools?.name || "—"}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--muted)" }}>{new Date(u.created_at).toLocaleDateString("zh-CN")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(u)}>编辑</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>删除</Button>
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
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        title={editingUser ? "编辑用户" : "添加用户"}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingUser(null); }}>取消</Button>
            <Button loading={saving} onClick={handleSave}>{editingUser ? "保存修改" : "保存"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="姓名 *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="请输入姓名" />
          <Input label="手机号 *" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="请输入手机号" />
          <Select label="角色 *" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
            <option value="STUDENT">学生</option>
            <option value="TEACHER">教师</option>
            <option value="ADMIN">管理员</option>
          </Select>
          <Select label="所属学校" value={form.school_id} onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}>
            <option value="">-- 选择学校 --</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
