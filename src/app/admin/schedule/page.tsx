"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select } from "@/components/ui";

interface Schedule {
  id: string;
  class_id?: string;
  teacher_id?: string | null;
  subject: string;
  weekday: number;
  time_start: string;
  time_end: string;
  room: string | null;
  week_type: string;
  classes?: { name: string };
  users?: { name: string };
}

interface AcademicTerm {
  id: string;
  name: string;
  term_start_date: string;
  term_end_date: string | null;
  is_active: boolean;
}

const weekDays = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [form, setForm] = useState({ class_id: "", teacher_id: "", subject: "", weekday: "1", time_start: "08:00", time_end: "09:00", room: "", week_type: "BOTH" });
  const [termForm, setTermForm] = useState({ name: "", term_start_date: "", term_end_date: "" });
  const [saving, setSaving] = useState(false);
  const [termSaving, setTermSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: sch }, { data: cls }, { data: tch }, { data: trm }] = await Promise.all([
      supabase.from("schedules").select("*, classes(name), users(name)").order("weekday").order("time_start"),
      supabase.from("classes").select("id, name"),
      supabase.from("users").select("id, name").eq("role", "TEACHER"),
      supabase.from("academic_terms").select("id, name, term_start_date, term_end_date, is_active").order("term_start_date", { ascending: false }),
    ]);
    setSchedules(sch ?? []);
    setClasses(cls ?? []);
    setTeachers(tch ?? []);
    setTerms((trm as AcademicTerm[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.class_id || !form.subject || !form.weekday || !form.teacher_id) {
      alert("请完整填写必填项（班级、教师、科目、星期）");
      return;
    }
    if (form.time_end <= form.time_start) {
      alert("结束时间必须晚于开始时间");
      return;
    }
    setSaving(true);
    let scheduleId: string | null = null;
    if (editingScheduleId) {
      const { data: updated } = await supabase.from("schedules").update({
        class_id: form.class_id,
        teacher_id: form.teacher_id || null,
        subject: form.subject,
        weekday: parseInt(form.weekday),
        time_start: form.time_start,
        time_end: form.time_end,
        room: form.room || null,
        week_type: form.week_type,
      }).eq("id", editingScheduleId).select("id").single();
      scheduleId = updated?.id ?? editingScheduleId;
    } else {
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
      scheduleId = inserted?.id ?? null;
    }

    // 通知对应教师
    if (form.teacher_id) {
      const className = classes.find((c) => c.id === form.class_id)?.name ?? "";
      const weekLabel = weekDays[parseInt(form.weekday)] ?? `周${form.weekday}`;
      await supabase.from("notifications").insert({
        user_id: form.teacher_id,
        type: "SCHEDULE",
        title: editingScheduleId ? "排班更新通知" : "新排班通知",
        content: `${editingScheduleId ? "管理员更新了您的课程安排" : "管理员为您安排了新课程"}：${form.subject}（${className}），${weekLabel} ${form.time_start}–${form.time_end}${form.room ? `，教室：${form.room}` : ""}。`,
        related_id: scheduleId,
      });
    }

    setSaving(false);
    setModalOpen(false);
    setEditingScheduleId(null);
    setForm({ class_id: "", teacher_id: "", subject: "", weekday: "1", time_start: "08:00", time_end: "09:00", room: "", week_type: "BOTH" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await supabase.from("schedules").delete().eq("id", id);
    load();
  };

  const handleEditSchedule = (s: Schedule) => {
    setEditingScheduleId(s.id);
    setForm({
      class_id: s.class_id ?? "",
      teacher_id: s.teacher_id ?? "",
      subject: s.subject ?? "",
      weekday: String(s.weekday ?? 1),
      time_start: s.time_start ?? "08:00",
      time_end: s.time_end ?? "09:00",
      room: s.room ?? "",
      week_type: s.week_type ?? "BOTH",
    });
    setModalOpen(true);
  };

  const handleSaveTerm = async () => {
    if (!termForm.name || !termForm.term_start_date) return;
    setTermSaving(true);
    if (editingTermId) {
      await supabase.from("academic_terms").update({
        name: termForm.name,
        term_start_date: termForm.term_start_date,
        term_end_date: termForm.term_end_date || null,
      }).eq("id", editingTermId);
    } else {
      await supabase.from("academic_terms").insert({
        name: termForm.name,
        term_start_date: termForm.term_start_date,
        term_end_date: termForm.term_end_date || null,
        is_active: false,
      });
    }
    setTermSaving(false);
    setTermModalOpen(false);
    setEditingTermId(null);
    setTermForm({ name: "", term_start_date: "", term_end_date: "" });
    load();
  };

  const handleSetActiveTerm = async (id: string) => {
    const target = terms.find((t) => t.id === id);
    if (!target) return;
    const ok = confirm(`确认将「${target.name}」设为当前学期吗？\n这会影响教师端和学生端课表的“当前周”计算。`);
    if (!ok) return;
    setTermSaving(true);
    await supabase.from("academic_terms").update({ is_active: false }).eq("is_active", true);
    await supabase.from("academic_terms").update({ is_active: true }).eq("id", id);
    setTermSaving(false);
    load();
  };

  const handleEditTerm = (term: AcademicTerm) => {
    setEditingTermId(term.id);
    setTermForm({
      name: term.name,
      term_start_date: term.term_start_date,
      term_end_date: term.term_end_date ?? "",
    });
    setTermModalOpen(true);
  };

  const handleDeleteTerm = async (term: AcademicTerm) => {
    if (term.is_active) {
      alert("当前学期不能直接删除，请先切换到其他学期后再删除。");
      return;
    }
    const ok = confirm(`确认删除学期「${term.name}」吗？此操作不可恢复。`);
    if (!ok) return;
    setTermSaving(true);
    await supabase.from("academic_terms").delete().eq("id", term.id);
    setTermSaving(false);
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

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>学期配置</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>课表当前周将基于“激活学期”的开始日期计算</p>
          </div>
          <Button
            onClick={() => {
              setEditingTermId(null);
              setTermForm({ name: "", term_start_date: "", term_end_date: "" });
              setTermModalOpen(true);
            }}
          >
            + 新增学期
          </Button>
        </div>
        <div className="space-y-2">
          {terms.length === 0 ? (
            <div className="text-sm py-3" style={{ color: "var(--muted)" }}>暂无学期配置</div>
          ) : (
            terms.map((term) => (
              <div
                key={term.id}
                className="rounded-xl border px-3 py-2 flex items-center justify-between gap-3"
                style={{ borderColor: "var(--card-border)", background: "var(--background)" }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{term.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    开始：{term.term_start_date}{term.term_end_date ? ` · 结束：${term.term_end_date}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {term.is_active ? (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--accent)", color: "#fff" }}>当前学期</span>
                  ) : (
                    <Button size="sm" variant="secondary" loading={termSaving} onClick={() => handleSetActiveTerm(term.id)}>
                      设为当前
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => handleEditTerm(term)}>编辑</Button>
                  <Button size="sm" variant="danger" loading={termSaving} onClick={() => handleDeleteTerm(term)}>删除</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

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
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEditSchedule(s)}>编辑</Button>
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
        onClose={() => {
          setModalOpen(false);
          setEditingScheduleId(null);
          setForm({ class_id: "", teacher_id: "", subject: "", weekday: "1", time_start: "08:00", time_end: "09:00", room: "", week_type: "BOTH" });
        }}
        title={editingScheduleId ? "编辑排班" : "添加排班"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button loading={saving} onClick={handleSave}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="班级 *" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
            <option value="">-- 必选：请选择班级 --</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="教师 *" value={form.teacher_id} onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}>
            <option value="">-- 必选：选择教师 --</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Input label="科目 *" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="必填，如：数学" />
          <Select label="星期 *" value={form.weekday} onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}>
            <option value="">-- 必选：请选择星期 --</option>
            {[1,2,3,4,5,6,7].map((d) => <option key={d} value={d}>{weekDays[d]}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="开始时间" type="time" value={form.time_start} onChange={(e) => setForm((f) => ({ ...f, time_start: e.target.value }))} />
            <Input label="结束时间" type="time" value={form.time_end} onChange={(e) => setForm((f) => ({ ...f, time_end: e.target.value }))} />
          </div>
          <Input label="教室" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="可选，如：A101" />
          <Select label="周类型" value={form.week_type} onChange={(e) => setForm((f) => ({ ...f, week_type: e.target.value }))}>
            <option value="BOTH">默认：全部周</option>
            <option value="ODD">单周</option>
            <option value="EVEN">双周</option>
          </Select>
        </div>
      </Modal>

      <Modal
        open={termModalOpen}
        onClose={() => {
          setTermModalOpen(false);
          setEditingTermId(null);
        }}
        title={editingTermId ? "编辑学期" : "新增学期"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTermModalOpen(false)}>取消</Button>
            <Button loading={termSaving} onClick={handleSaveTerm}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="学期名称 *"
            value={termForm.name}
            onChange={(e) => setTermForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="如：2025-2026学年第二学期"
          />
          <Input
            label="开始日期 *"
            type="date"
            value={termForm.term_start_date}
            onChange={(e) => setTermForm((f) => ({ ...f, term_start_date: e.target.value }))}
          />
          <Input
            label="结束日期"
            type="date"
            value={termForm.term_end_date}
            onChange={(e) => setTermForm((f) => ({ ...f, term_end_date: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
