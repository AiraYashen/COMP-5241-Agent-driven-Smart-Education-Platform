"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal, Input, Select, Badge } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  deadline: string | null;
  allow_late: boolean;
  created_at: string;
  classes?: { name: string };
  _submissionCount?: number;
}

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const t = useTranslations();
  const teacherId = (session?.user as any)?.id;
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submissionsModal, setSubmissionsModal] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", subject: "", description: "", class_id: "", deadline: "", allow_late: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!teacherId) return;
    setLoading(true);
    const [{ data: asgn }, { data: cls }] = await Promise.all([
      supabase.from("assignments").select("*, classes(name)").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
      supabase.from("teacher_classes").select("classes(id, name)").eq("teacher_id", teacherId),
    ]);
    setAssignments(asgn ?? []);
    setClasses(cls?.map((tc: any) => tc.classes).filter(Boolean) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.class_id || !form.subject) return;
    setSaving(true);
    await supabase.from("assignments").insert({
      teacher_id: teacherId,
      class_id: form.class_id,
      subject: form.subject,
      title: form.title,
      description: form.description || null,
      deadline: form.deadline || null,
      allow_late: form.allow_late,
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ title: "", subject: "", description: "", class_id: "", deadline: "", allow_late: false });
    load();
  };

  const openSubmissions = async (asgn: Assignment) => {
    setSubmissionsModal(asgn);
    const { data } = await supabase
      .from("submissions")
      .select("*, users(name)")
      .eq("assignment_id", asgn.id)
      .order("submitted_at", { ascending: false });
    setSubmissions(data ?? []);
  };

  const isOverdue = (deadline: string | null) => deadline && new Date(deadline) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("assignmentsEx.manageTitle")}</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("assignmentsEx.manageSub")}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ {t("dashboard.createAssignment")}</Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card><p className="text-center py-4" style={{ color: "var(--muted)" }}>{t("common.loading")}</p></Card>
        ) : assignments.length === 0 ? (
          <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("assignmentsEx.noAssignments")}</p></Card>
        ) : assignments.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>{a.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>{a.subject}</span>
                  {a.classes && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--background)", color: "var(--muted)" }}>{a.classes.name}</span>}
                  {a.allow_late && <Badge variant="warning">{t("assignmentsEx.allowLate")}</Badge>}
                </div>
                {a.description && <p className="text-sm mb-2 line-clamp-2" style={{ color: "var(--muted)" }}>{a.description}</p>}
                {a.deadline && (
                  <p className="text-xs" style={{ color: isOverdue(a.deadline) ? "#ef4444" : "var(--muted)" }}>
                    {t("assignmentsEx.deadlineLabel")}: {new Date(a.deadline).toLocaleString()}
                    {isOverdue(a.deadline) && " " + t("assignmentsEx.closedSuffix")}
                  </p>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={() => openSubmissions(a)}>{t("assignmentsEx.viewSubmissions")}</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("dashboard.createAssignment")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button loading={saving} onClick={handleSave}>{t("assignmentsEx.publishBtn")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label={t("assignmentsEx.clasRequired")} value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
            <option value="">{t("common.selectClass")}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label={t("assignmentsEx.subjectRequired")} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder={t("common.subjectPlaceholder")} />
          <Input label={t("assignmentsEx.titleRequired")} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t("assignmentsEx.titlePlaceholder")} />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>{t("assignmentsEx.descriptionLabel")}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder={t("assignmentsEx.descriptionPlaceholder")}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none resize-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
            />
          </div>
          <Input label={t("assignmentsEx.deadlineLabel")} type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.allow_late} onChange={(e) => setForm((f) => ({ ...f, allow_late: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm" style={{ color: "var(--foreground)" }}>{t("assignmentsEx.allowLateLabel")}</span>
          </label>
        </div>
      </Modal>

      <Modal
        open={!!submissionsModal}
        onClose={() => setSubmissionsModal(null)}
        title={`${t("assignmentsEx.submissionStatus")} — ${submissionsModal?.title}`}
      >
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {submissions.length === 0 ? (
            <p className="text-center py-4" style={{ color: "var(--muted)" }}>{t("assignmentsEx.noStudentSubmissions")}</p>
          ) : submissions.map((s) => (
            <div key={s.id} className="py-2 border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.users?.name}</p>
                  {s.content && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted)" }}>{s.content}</p>}
                  {s.file_url && (
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-xs mt-0.5 inline-block" style={{ color: "var(--accent)" }}>
                      {t("assignmentsEx.viewUploadedFile")}
                    </a>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  {s.score != null ? (
                    <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{s.score}分</span>
                  ) : (
                    <Badge variant="warning">{t("assignmentsEx.pendingReview")}</Badge>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{new Date(s.submitted_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
