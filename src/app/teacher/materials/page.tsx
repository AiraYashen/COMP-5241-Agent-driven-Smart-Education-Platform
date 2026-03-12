"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select, Badge } from "@/components/ui";
import { useSession } from "next-auth/react";

const FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
  "application/msword": "WORD",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "WORD",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
};

const typeColors: Record<string, string> = {
  PDF: "#ef4444",
  PPT: "#f97316",
  WORD: "#3b82f6",
  VIDEO: "#8b5cf6",
  IMAGE: "#10b981",
  OTHER: "#6b7280",
};

export default function MaterialsPage() {
  const { data: session } = useSession();
  const teacherId = (session?.user as any)?.id;
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", class_id: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!teacherId) return;
    setLoading(true);
    const [{ data: mat }, { data: cls }] = await Promise.all([
      supabase.from("materials").select("*, classes(name)").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
      supabase.from("teacher_classes").select("classes(id, name)").eq("teacher_id", teacherId),
    ]);
    setMaterials(mat ?? []);
    setClasses(cls?.map((tc: any) => tc.classes).filter(Boolean) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]);

  const handleUpload = async () => {
    if (!selectedFile || !form.title || !form.class_id || !form.subject) return;
    setUploading(true);

    // Upload via server-side API (handles storage + DB insert with admin key)
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("class_id", form.class_id);
    fd.append("subject", form.subject);
    fd.append("title", form.title);
    fd.append("file_size", String(selectedFile.size));
    const uploadRes = await fetch("/api/teacher/upload-material", { method: "POST", body: fd });
    if (!uploadRes.ok) {
      const { error } = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }));
      alert("上传失败: " + error);
      setUploading(false);
      return;
    }
    setUploading(false);
    setModalOpen(false);
    setForm({ title: "", subject: "", class_id: "" });
    setSelectedFile(null);
    load();
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("确认删除？")) return;
    await supabase.from("materials").delete().eq("id", id);
    load();
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>课件管理</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>上传和管理教学课件</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ 上传课件</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p style={{ color: "var(--muted)" }}>加载中...</p>
        ) : materials.length === 0 ? (
          <Card className="col-span-3">
            <p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无课件</p>
          </Card>
        ) : materials.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: typeColors[m.type] ?? "#6b7280" }}
              >
                {m.type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm" style={{ color: "var(--foreground)" }}>{m.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{m.classes?.name} · {m.subject}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {formatSize(m.file_size)} · {new Date(m.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
              <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">下载/预览</Button>
              </a>
              <Button size="sm" variant="danger" onClick={() => handleDelete(m.id, m.file_url)}>删除</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="上传课件"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button loading={uploading} onClick={handleUpload} disabled={!selectedFile}>上传</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="班级 *" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
            <option value="">-- 选择班级 --</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="科目 *" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="如：数学" />
          <Input label="课件标题 *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="请输入课件标题" />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>选择文件 *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.mov,.webm,.jpg,.jpeg,.png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:cursor-pointer"
              style={{ color: "var(--foreground)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>支持 PDF、PPT、Word、MP4、图片等格式</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
