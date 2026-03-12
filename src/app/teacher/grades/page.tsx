"use client";
import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

interface GradeRow {
  id: string;
  student_id: string;
  class_id: string;
  subject: string;
  score: number;
  total_score: number;
  exam_name: string | null;
  teacher_id: string;
  created_at: string;
  users: { name: string } | null;
  classes: { name: string } | null;
}

const EMPTY_FORM = { student_id: "", class_id: "", subject: "", score: "", total_score: "100", exam_name: "" };

export default function GradesPage() {
  const { data: session } = useSession();
  const t = useTranslations();
  const teacherId = (session?.user as any)?.id;
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fClass, setFClass] = useState("");
  const [fStudent, setFStudent] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fExam, setFExam] = useState("");

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formStudents, setFormStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Excel import
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!teacherId) return;
    setLoading(true);
    const [{ data: g }, { data: cls }] = await Promise.all([
      supabase.from("grades").select("*, users!student_id(name), classes(name)").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
      supabase.from("teacher_classes").select("classes(id, name)").eq("teacher_id", teacherId),
    ]);
    const classArr = cls?.map((tc: any) => tc.classes).filter(Boolean) ?? [];
    setGrades((g ?? []) as GradeRow[]);
    setClasses(classArr);
    if (classArr.length > 0) {
      const { data: ens } = await supabase
        .from("enrollments")
        .select("class_id, users(id, name)")
        .in("class_id", classArr.map((c: any) => c.id));
      setAllStudents(ens?.map((e: any) => ({ ...e.users, class_id: e.class_id })).filter(Boolean) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormStudents([]);
    setModalOpen(true);
  };

  const openEdit = (g: GradeRow) => {
    setEditId(g.id);
    setForm({ student_id: g.student_id, class_id: g.class_id, subject: g.subject, score: String(g.score), total_score: String(g.total_score ?? 100), exam_name: g.exam_name ?? "" });
    setFormStudents(allStudents.filter((s) => s.class_id === g.class_id));
    setModalOpen(true);
  };

  const handleFormClassChange = (classId: string) => {
    setForm((f) => ({ ...f, class_id: classId, student_id: "" }));
    setFormStudents(allStudents.filter((s) => s.class_id === classId));
  };

  const handleSave = async () => {
    if (!form.student_id || !form.class_id || !form.subject || !form.score) return;
    setSaving(true);
    const payload = {
      student_id: form.student_id, class_id: form.class_id, subject: form.subject,
      score: parseFloat(form.score), total_score: parseFloat(form.total_score) || 100,
      exam_name: form.exam_name || null, teacher_id: teacherId,
    };
    if (editId) {
      await supabase.from("grades").update(payload).eq("id", editId);
    } else {
      const { data: grade } = await supabase.from("grades").insert(payload).select().single();
      if (grade) {
        await supabase.from("notifications").insert({
          user_id: form.student_id, type: "GRADE_PUBLISHED", title: "成绩已发布",
          content: `${form.subject}${form.exam_name ? ` — ${form.exam_name}` : ""}: ${form.score}分`,
          related_id: grade.id,
        });
      }
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from("grades").delete().eq("id", deleteId);
    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const errors: string[] = [];
        const parsed = rows.map((row, i) => {
          const rowNum = i + 2;
          const 班级 = String(row["班级"] ?? "").trim();
          const 学生姓名 = String(row["学生姓名"] ?? "").trim();
          const 科目 = String(row["科目"] ?? "").trim();
          const 考试名称 = String(row["考试名称"] ?? "").trim();
          const 得分 = parseFloat(String(row["得分"] ?? ""));
          const 满分 = parseFloat(String(row["满分"] ?? "100")) || 100;
          if (!班级) errors.push(`第${rowNum}行：班级不能为空`);
          if (!学生姓名) errors.push(`第${rowNum}行：学生姓名不能为空`);
          if (!科目) errors.push(`第${rowNum}行：科目不能为空`);
          if (isNaN(得分)) errors.push(`第${rowNum}行：得分必须为数字`);
          return { 班级, 学生姓名, 科目, 考试名称, 得分, 满分, _row: rowNum };
        });
        setImportErrors(errors);
        setImportRows(parsed);
      } catch {
        setImportErrors(["文件解析失败，请确认文件格式正确"]);
        setImportRows([]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (importErrors.length > 0 || importRows.length === 0) return;
    setImporting(true);
    const classMap = new Map(classes.map((c: any) => [c.name, c.id]));
    const studentByNameClass = new Map(
      allStudents.map((s) => {
        const cls = classes.find((c: any) => c.id === s.class_id);
        return [`${s.name}|${cls?.name ?? ""}`, s];
      })
    );
    const errors: string[] = [];
    const inserts: any[] = [];
    for (const row of importRows) {
      const classId = classMap.get(row.班级);
      if (!classId) { errors.push(`第${row._row}行：找不到班级"${row.班级}"`); continue; }
      const student = studentByNameClass.get(`${row.学生姓名}|${row.班级}`);
      if (!student) { errors.push(`第${row._row}行：在班级"${row.班级}"中找不到学生"${row.学生姓名}"`); continue; }
      inserts.push({ student_id: student.id, class_id: classId, subject: row.科目, score: row.得分, total_score: row.满分, exam_name: row.考试名称 || null, teacher_id: teacherId });
    }
    if (errors.length > 0) { setImportErrors(errors); setImporting(false); return; }
    const { data: inserted } = await supabase.from("grades").insert(inserts).select();
    if (inserted && inserted.length > 0) {
      await supabase.from("notifications").insert(
        inserted.map((g: any) => ({ user_id: g.student_id, type: "GRADE_PUBLISHED", title: "成绩已发布", content: `${g.subject}${g.exam_name ? ` — ${g.exam_name}` : ""}: ${g.score}分`, related_id: g.id }))
      );
    }
    setImporting(false);
    setImportOpen(false);
    setImportRows([]);
    setImportErrors([]);
    load();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["班级", "学生姓名", "科目", "考试名称", "得分", "满分"],
      ["高三(1)班", "李同学", "数学", "期末考试", 95, 100],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "成绩");
    XLSX.writeFile(wb, "成绩导入模板.xlsx");
  };

  const uniqueClasses = [...new Map(grades.map((g) => [g.class_id, g.classes?.name ?? ""])).entries()];
  const uniqueStudents = fClass
    ? [...new Map(grades.filter((g) => g.class_id === fClass).map((g) => [g.student_id, g.users?.name ?? ""])).entries()]
    : [...new Map(grades.map((g) => [g.student_id, g.users?.name ?? ""])).entries()];
  const uniqueSubjects = [...new Set(grades.map((g) => g.subject))];
  const filtered = grades.filter((g) =>
    (!fClass || g.class_id === fClass) &&
    (!fStudent || g.student_id === fStudent) &&
    (!fSubject || g.subject === fSubject) &&
    (!fExam || (g.exam_name ?? "").includes(fExam))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("gradesEx.manageTitle")}</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("gradesEx.manageSub")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setImportRows([]); setImportErrors([]); setImportOpen(true); }}>{t("grades.importExcel")}</Button>
          <Button onClick={openAdd}>+ {t("gradesEx.addGrade")}</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{t("common.class")}</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              value={fClass} onChange={(e) => { setFClass(e.target.value); setFStudent(""); }}>
              <option value="">{t("common.allClasses")}</option>
              {uniqueClasses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{t("common.student")}</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              value={fStudent} onChange={(e) => setFStudent(e.target.value)}>
              <option value="">{t("common.allStudents")}</option>
              <option value="">{t("common.allStudents")}</option>
              {uniqueStudents.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{t("common.subject")}</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
              <option value="">{t("common.allSubjects")}</option>
              {uniqueSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{t("grades.exam")}</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              placeholder={t("gradesEx.searchExam")} value={fExam} onChange={(e) => setFExam(e.target.value)} />
          </div>
        </div>
        {(fClass || fStudent || fSubject || fExam) && (
          <div className="flex justify-end mt-2">
            <button className="text-xs" style={{ color: "var(--accent)" }}
              onClick={() => { setFClass(""); setFStudent(""); setFSubject(""); setFExam(""); }}>{t("common.clearFilter")}</button>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--foreground)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                {[t("common.student"), t("common.class"), t("common.subject"), t("grades.exam"), t("grades.score"), t("grades.total"), t("gradesEx.publishTime"), t("common.actions")].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>{t("common.loading")}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>{t("gradesEx.noGrades")}</td></tr>
              ) : filtered.map((g) => (
                <tr key={g.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-4 py-3 font-medium">{g.users?.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{g.classes?.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--accent)" }}>{g.subject}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{g.exam_name || "—"}</td>
                  <td className="px-4 py-3 font-bold">{g.score}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{g.total_score}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{new Date(g.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
                        onClick={() => openEdit(g)}>{t("common.edit")}</button>
                      <button className="text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: "#ef4444", border: "1px solid #ef4444" }}
                        onClick={() => setDeleteId(g.id)}>{t("common.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t text-xs" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
            {t("gradesEx.recordCount", { count: filtered.length })}{filtered.length < grades.length ? ` (${t("common.allClasses")} ${grades.length})` : ""}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("gradesEx.editGrade") : t("gradesEx.addGrade")}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
          <Button loading={saving} onClick={handleSave}>{editId ? t("gradesEx.saveEdit") : t("gradesEx.saveAndNotify")}</Button></>}>
        <div className="space-y-3">
          <Select label={t("common.class") + " *"} value={form.class_id} onChange={(e) => handleFormClassChange(e.target.value)}>
            <option value="">{t("common.selectClass")}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label={t("common.student") + " *"} value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
            <option value="">{t("common.selectStudent")}</option>
            {formStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label={t("common.subject") + " *"} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder={t("common.subjectPlaceholder")} />
          <Input label={t("grades.exam")} value={form.exam_name} onChange={(e) => setForm((f) => ({ ...f, exam_name: e.target.value }))} placeholder={t("gradesEx.searchExam")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("grades.score") + " *"} type="number" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} placeholder="0" />
            <Input label={t("grades.total")} type="number" value={form.total_score} onChange={(e) => setForm((f) => ({ ...f, total_score: e.target.value }))} placeholder="100" />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t("common.confirmDeleteTitle")}
        footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>{t("common.confirmDeleteTitle")}</Button></>}>
        <p style={{ color: "var(--foreground)" }}>{t("gradesEx.confirmDeleteMsg")}</p>
      </Modal>

      {/* Excel Import Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={t("gradesEx.importTitle")}
        footer={<><Button variant="secondary" onClick={() => setImportOpen(false)}>{t("common.cancel")}</Button>
          <Button loading={importing} onClick={handleImport} disabled={importRows.length === 0 || importErrors.length > 0}>
            {t("gradesEx.confirmImportCount", { count: importRows.length })}</Button></>}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button className="text-sm px-3 py-1.5 rounded-lg"
              style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
              onClick={downloadTemplate}>{t("gradesEx.downloadTemplate")}</button>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{t("gradesEx.templateHint")}</span>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <button className="w-full border-2 border-dashed rounded-xl py-8 text-sm transition-all"
            style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            onClick={() => fileInputRef.current?.click()}>
            {t("gradesEx.selectExcel")}
          </button>
          {importErrors.length > 0 && (
            <div className="p-3 rounded-xl text-xs space-y-1"
              style={{ background: "rgba(220,38,38,0.1)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.2)" }}>
              {importErrors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          {importRows.length > 0 && importErrors.length === 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{t("gradesEx.previewCount", { count: importRows.length })}</p>
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--card-border)" }}>
                      {[t("common.class"), t("common.student"), t("common.subject"), t("grades.exam"), t("grades.score"), t("grades.total")].map((h) => (
                        <th key={h} className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                        <td className="px-3 py-2">{r.班级}</td><td className="px-3 py-2">{r.学生姓名}</td>
                        <td className="px-3 py-2">{r.科目}</td><td className="px-3 py-2">{r.考试名称 || "—"}</td>
                        <td className="px-3 py-2">{r.得分}</td><td className="px-3 py-2">{r.满分}</td>
                      </tr>
                    ))}
                    {importRows.length > 10 && (
                      <tr><td colSpan={6} className="px-3 py-2 text-center" style={{ color: "var(--muted)" }}>{t("gradesEx.moreRows", { count: importRows.length - 10 })}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
