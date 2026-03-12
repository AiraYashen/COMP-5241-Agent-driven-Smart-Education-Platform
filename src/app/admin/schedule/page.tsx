"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select } from "@/components/ui";

interface Schedule {
  id: string;
  subject: string;
  weekday: number;
  time_start: string;
  time_end: string;
  room: string | null;
  week_type: string;
  classes?: { name: string };
  users?: { name: string };
}

const weekDays = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ class_id: "", teacher_id: "", subject: "", weekday: "1", time_start: "08:00", time_end: "09:00", room: "", week_type: "BOTH" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: sch }, { data: cls }, { data: tch }] = await Promise.all([
      supabase.from("schedules").select("*, classes(name), users(name)").order("weekday").order("time_start"),
      supabase.from("classes").select("id, name"),
      supabase.from("users").select("id, name").eq("role", "TEACHER"),
    ]);
    setSchedules(sch ?? []);
    setClasses(cls ?? []);
    setTeachers(tch ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.class_id || !form.subject || !form.weekday) return;
    setSaving(true);

    const { data: inserted } = await supabase.from("schedules").insert({
      class_id: form.class_id,
      teacher_id: form.teacher_id || null,
      subject: form.subject,
      weekday: parseInt(form.weekday),
      time_start: form.time_start,
      time_end: form.time_end,
      room: form.room || null,
      week_type: form.week_type,
    }).select("id").single();

    // 通知对应教师
    if (form.teacher_id) {
      const className = classes.find((c) => c.id === form.class_id)?.name ?? "";
      const weekLabel = weekDays[parseInt(form.weekday)] ?? `周${form.weekday}`;
      await supabase.from("notifications").insert({
        user_id: form.teacher_id,
        type: "SCHEDULE",
        title: "新排班通知",
        content: `管理员为您安排了新课程：${form.subject}（${className}），${weekLabel} ${form.time_start}–${form.time_end}${form.room ? `，教室：${form.room}` : ""}。`,
        related_id: inserted?.id ?? null,
      });
    }

    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await supabase.from("schedules").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>课表管理</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>配置教师排班与课程安排</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ 添加排班</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--foreground)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                {["班级", "科目", "教师", "星期", "时间", "教室", "周类型", "操作"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>加载中...</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>暂无排班数据</td></tr>
              ) : schedules.map((s) => (
                <tr key={s.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-4 py-3">{s.classes?.name}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--accent)" }}>{s.subject}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{s.users?.name || "—"}</td>
                  <td className="px-4 py-3">{weekDays[s.weekday]}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{s.time_start} – {s.time_end}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{s.room || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{{ BOTH: "全周", ODD: "单周", EVEN: "双周" }[s.week_type] || s.week_type}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}>删除</Button>
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
        title="添加排班"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button loading={saving} onClick={handleSave}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="班级 *" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
            <option value="">-- 选择班级 --</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="教师" value={form.teacher_id} onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}>
            <option value="">-- 选择教师 --</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Input label="科目 *" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="如：数学" />
          <Select label="星期 *" value={form.weekday} onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}>
            {[1,2,3,4,5,6,7].map((d) => <option key={d} value={d}>{weekDays[d]}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="开始时间" type="time" value={form.time_start} onChange={(e) => setForm((f) => ({ ...f, time_start: e.target.value }))} />
            <Input label="结束时间" type="time" value={form.time_end} onChange={(e) => setForm((f) => ({ ...f, time_end: e.target.value }))} />
          </div>
          <Input label="教室" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="如：A101（可选）" />
          <Select label="周类型" value={form.week_type} onChange={(e) => setForm((f) => ({ ...f, week_type: e.target.value }))}>
            <option value="BOTH">全部周</option>
            <option value="ODD">单周</option>
            <option value="EVEN">双周</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}
