"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input } from "@/components/ui";
import { useSession } from "next-auth/react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  classes?: { name: string };
  readCount?: number;
  totalStudents?: number;
}

export default function AnnouncementsPage() {
  const { data: session } = useSession();
  const teacherId = (session?.user as any)?.id;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reads, setReads] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", content: "", class_id: "", push_threshold_hours: "24" });
  const [saving, setSaving] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!teacherId) return;
    setLoading(true);
    const [{ data: ann }, { data: cls }] = await Promise.all([
      supabase.from("announcements").select("*, classes(name)").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
      supabase.from("teacher_classes").select("classes(id, name)").eq("teacher_id", teacherId),
    ]);
    setAnnouncements(ann ?? []);
    setClasses(cls?.map((tc: any) => tc.classes).filter(Boolean) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.class_id) return;
    setSaving(true);
    if (editAnn) {
      await supabase.from("announcements").update({
        class_id: form.class_id,
        title: form.title,
        content: form.content,
        push_threshold_hours: parseInt(form.push_threshold_hours),
      }).eq("id", editAnn.id);
      setEditAnn(null);
    } else {
      await supabase.from("announcements").insert({
        teacher_id: teacherId,
        class_id: form.class_id,
        title: form.title,
        content: form.content,
        push_threshold_hours: parseInt(form.push_threshold_hours),
      });
      setModalOpen(false);
    }
    setSaving(false);
    setForm({ title: "", content: "", class_id: "", push_threshold_hours: "24" });
    load();
  };

  const handleEdit = (ann: Announcement) => {
    setForm({
      title: ann.title,
      content: ann.content,
      class_id: (ann as any).class_id ?? "",
      push_threshold_hours: String((ann as any).push_threshold_hours ?? "24"),
    });
    setEditAnn(ann);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from("announcements").delete().eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    const { data } = await supabase
      .from("announcement_reads")
      .select("*, users(name, phone)")
      .eq("announcement_id", id);
    setReads(data ?? []);
  };

  const handlePushUnread = async (ann: Announcement) => {
    // Write notifications for unread students
    const readStudentIds = reads.map((r) => r.student_id);
    const { data: enrolled } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("class_id", ann.classes ? (ann as any).class_id : "");
    const unread = (enrolled ?? []).filter((e: any) => !readStudentIds.includes(e.student_id));
    if (unread.length === 0) { alert("所有学生已读"); return; }
    await supabase.from("notifications").insert(
      unread.map((e: any) => ({
        user_id: e.student_id,
        type: "ANNOUNCEMENT_REMINDER",
        title: "请查看公告",
        content: ann.title,
        related_id: ann.id,
      }))
    );
    alert(`已向 ${unread.length} 名未读学生发送提醒`);
  };

  const selectedAnn = announcements.find((a) => a.id === detailId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>公告管理</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>发布公告并跟踪学生已读情况</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ 发布公告</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card><p className="text-center py-4" style={{ color: "var(--muted)" }}>加载中...</p></Card>
        ) : announcements.length === 0 ? (
          <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无公告</p></Card>
        ) : announcements.map((ann) => (
          <Card key={ann.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate" style={{ color: "var(--foreground)" }}>{ann.title}</h3>
                  {ann.classes && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                      {ann.classes.name}
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-2" style={{ color: "var(--muted)" }}>{ann.content}</p>
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  {new Date(ann.created_at).toLocaleString("zh-CN")}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openDetail(ann.id)}>查看已读</Button>
                <Button size="sm" variant="ghost" onClick={() => handlePushUnread(ann)}>推送未读</Button>
                <Button size="sm" variant="secondary" onClick={() => handleEdit(ann)}>修改</Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteId(ann.id)}>删除</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* New / Edit announcement modal */}
      <Modal
        open={modalOpen || !!editAnn}
        onClose={() => { setModalOpen(false); setEditAnn(null); setForm({ title: "", content: "", class_id: "", push_threshold_hours: "24" }); }}
        title={editAnn ? "修改公告" : "发布公告"}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditAnn(null); setForm({ title: "", content: "", class_id: "", push_threshold_hours: "24" }); }}>取消</Button>
            <Button loading={saving} onClick={handleSave}>{editAnn ? "保存" : "发布"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>目标班级 *</label>
            <select
              value={form.class_id}
              onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
            >
              <option value="">-- 选择班级 --</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input label="标题 *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="请输入公告标题" />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              placeholder="请输入公告内容"
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none resize-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="确认删除"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>确认删除</Button>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--foreground)" }}>确定要删除该公告吗？此操作不可撤销。</p>
      </Modal>

      {/* Read status detail modal */}
      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={`已读情况 — ${selectedAnn?.title}`}
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {reads.length === 0 ? (
            <p className="text-center py-4" style={{ color: "var(--muted)" }}>无学生已读记录</p>
          ) : reads.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <span className="text-sm" style={{ color: "var(--foreground)" }}>{r.users?.name}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(r.read_at).toLocaleString("zh-CN")}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
