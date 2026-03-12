"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal } from "@/components/ui";
import { useSession } from "next-auth/react";

export default function StudentAssignmentsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [submitText, setSubmitText] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [viewSub, setViewSub] = useState<any | null>(null);
  // Quiz-type assignment state
  const [quizAssignment, setQuizAssignment] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  const load = async () => {
    if (!userId) return;
    const { data: enrollment } = await supabase.from("enrollments").select("class_id").eq("student_id", userId).single();
    const classId = enrollment?.class_id;
    if (!classId) { setLoading(false); return; }

    const { data: asgn } = await supabase
      .from("assignments")
      .select("id, title, description, deadline, created_at, subject")
      .eq("class_id", classId)
      .order("deadline");

    const ids = (asgn ?? []).map((a: any) => a.id);
    const { data: subs } = ids.length > 0
      ? await supabase.from("submissions").select("assignment_id, submitted_at, content, file_url, score, feedback").eq("student_id", userId).in("assignment_id", ids)
      : { data: [] };

    const subMap: Record<string, any> = {};
    (subs ?? []).forEach((s: any) => { subMap[s.assignment_id] = s; });
    setAssignments((asgn ?? []).map((a: any) => ({ ...a, submission: subMap[a.id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const handleSubmit = async () => {
    if (!selected || (!submitText.trim() && !submitFile && !existingFileUrl)) return;
    setSubmitting(true);
    // Start with the existing file URL so we don't lose it if no new file is chosen
    let fileUrl: string | null = existingFileUrl;

    if (submitFile) {
      const fd = new FormData();
      fd.append("file", submitFile);
      fd.append("assignment_id", selected.id);
      const res = await fetch("/api/student/upload-submission", { method: "POST", body: fd });
      if (res.ok) {
        const json = await res.json();
        fileUrl = json.url ?? fileUrl;
      }
    }

    await supabase.from("submissions").upsert({
      student_id: userId,
      assignment_id: selected.id,
      content: submitText || null,
      file_url: fileUrl,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "student_id,assignment_id" });

    setSubmitting(false);
    setSelected(null);
    setSubmitText("");
    setSubmitFile(null);
    setExistingFileUrl(null);
    load();
  };

  const isQuizAssignment = (a: any) =>
    typeof a.description === "string" && a.description.startsWith("__QUIZ__:");

  const parseQuizQuestions = (desc: string) => {
    try { return JSON.parse(desc.slice("__QUIZ__:".length)) as any[]; }
    catch { return []; }
  };

  const handleSubmitQuiz = async () => {
    if (!quizAssignment) return;
    setQuizSubmitting(true);
    const questions = parseQuizQuestions(quizAssignment.description);
    let correct = 0;
    const wrongInserts: any[] = [];
    questions.forEach((q: any) => {
      const picked = quizAnswers[q.id];
      if (picked === q.answer) {
        correct++;
      } else {
        wrongInserts.push({
          student_id: userId,
          assignment_id: quizAssignment.id,
          question_content: q.question,
          student_answer: picked ?? "未作答",
          correct_answer: q.answer,
          knowledge_point: q.explanation ?? q.question,
          subject: quizAssignment.subject ?? "",
        });
      }
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    await supabase.from("submissions").upsert({
      student_id: userId,
      assignment_id: quizAssignment.id,
      content: JSON.stringify(quizAnswers),
      file_url: null,
      submitted_at: new Date().toISOString(),
      score,
    }, { onConflict: "student_id,assignment_id" });
    // Re-record wrong questions (delete old ones first)
    await supabase.from("wrong_questions").delete()
      .eq("student_id", userId).eq("assignment_id", quizAssignment.id);
    if (wrongInserts.length > 0) {
      await supabase.from("wrong_questions").insert(wrongInserts);
    }
    setQuizSubmitting(false);
    setQuizAssignment(null);
    setQuizAnswers({});
    load();
  };

  const now = new Date();
  const pending = assignments.filter((a) => !a.submission && new Date(a.deadline) >= now);
  const submitted = assignments.filter((a) => a.submission);
  const overdue = assignments.filter((a) => !a.submission && new Date(a.deadline) < now);

  const AssignmentCard = ({ a, showStatus }: { a: any; showStatus: string }) => {
    const deadline = new Date(a.deadline);
    const isLate = a.submission && new Date(a.submission.submitted_at) > deadline;
    const isQuiz = isQuizAssignment(a);
    const quizQCount = isQuiz ? parseQuizQuestions(a.description).length : 0;
    return (
      <div className="p-3 rounded-xl border" style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{a.title}</div>
              {isQuiz && (
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                  选择题 {quizQCount} 题
                </span>
              )}
            </div>
            {!isQuiz && a.description && <div className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted)" }}>{a.description}</div>}
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>截止 {deadline.toLocaleDateString("zh-CN")} {deadline.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {showStatus === "pending" && (
              isQuiz
                ? <Button size="sm" onClick={() => { setQuizAnswers({}); setQuizAssignment(a); }}>答题</Button>
                : <Button size="sm" onClick={() => setSelected(a)}>提交</Button>
            )}
            {showStatus === "submitted" && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setViewSub(a)}>查看</Button>
                {isQuiz
                  ? <Button size="sm" variant="ghost" onClick={() => {
                      const prev = (() => { try { return JSON.parse(a.submission?.content ?? "{}"); } catch { return {}; } })();
                      setQuizAnswers(prev);
                      setQuizAssignment(a);
                    }}>重新作答</Button>
                  : <Button size="sm" variant="ghost" onClick={() => {
                      setSelected(a);
                      setSubmitText(a.submission?.content ?? "");
                      setExistingFileUrl(a.submission?.file_url ?? null);
                    }}>编辑</Button>
                }
              </>
            )}
            {showStatus === "overdue" && (
              isQuiz
                ? <Button size="sm" variant="danger" onClick={() => { setQuizAnswers({}); setQuizAssignment(a); }}>补答</Button>
                : <Button size="sm" variant="danger" onClick={() => setSelected(a)}>补交</Button>
            )}
          </div>
        </div>
        {a.submission?.score != null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: a.submission.score >= 90 ? "#22c55e" : a.submission.score >= 60 ? "var(--accent)" : "#ef4444" }}>
              {a.submission.score}分
            </span>
            {isLate && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#d97706" }}>迟交</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>我的作业</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>待交 {pending.length} · 已交 {submitted.length} · 逾期 {overdue.length}</p>
      </div>

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>加载中...</p></Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--accent)" }}>待提交</h3>
              <div className="space-y-2">{pending.map((a) => <AssignmentCard key={a.id} a={a} showStatus="pending" />)}</div>
            </Card>
          )}
          {submitted.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#22c55e" }}>已提交</h3>
              <div className="space-y-2">{submitted.map((a) => <AssignmentCard key={a.id} a={a} showStatus="submitted" />)}</div>
            </Card>
          )}
          {overdue.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#ef4444" }}>已逾期</h3>
              <div className="space-y-2">{overdue.map((a) => <AssignmentCard key={a.id} a={a} showStatus="overdue" />)}</div>
            </Card>
          )}
          {assignments.length === 0 && (
            <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无作业</p></Card>
          )}
        </div>
      )}

      {/* Submit / Edit modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setSubmitText(""); setSubmitFile(null); setExistingFileUrl(null); }} title={(selected?.submission ? "编辑作业：" : "提交作业：") + (selected?.title ?? "")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>文字回答</label>
            <textarea
              value={submitText}
              onChange={(e) => setSubmitText(e.target.value)}
              rows={5}
              placeholder="输入你的作答..."
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>附件（可选）</label>
            {existingFileUrl && !submitFile && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--muted)" }}>已上传附件：</span>
                <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs truncate max-w-xs" style={{ color: "var(--accent)" }}>查看已上传文件</a>
              </div>
            )}
            <input type="file" onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)} className="text-sm" style={{ color: "var(--foreground)" }} />
            {submitFile && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>已选: {submitFile.name}（将替换原附件）</p>}
          </div>
          <Button onClick={handleSubmit} loading={submitting} disabled={!submitText.trim() && !submitFile && !existingFileUrl} className="w-full">{selected?.submission ? "保存修改" : "提交作业"}</Button>
        </div>
      </Modal>

      {/* View submission modal */}
      <Modal open={!!viewSub} onClose={() => setViewSub(null)} title={viewSub?.title ?? ""}>
        {viewSub?.submission && (() => {
          const isQuiz = isQuizAssignment(viewSub);
          if (isQuiz) {
            const questions = parseQuizQuestions(viewSub.description);
            const answers: Record<number, string> = (() => {
              try { return JSON.parse(viewSub.submission.content ?? "{}"); } catch { return {}; }
            })();
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: "var(--muted)" }}>提交时间:</span>
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>{new Date(viewSub.submission.submitted_at).toLocaleString("zh-CN")}</span>
                  {viewSub.submission.score != null && (
                    <span className="ml-auto text-xl font-bold" style={{ color: viewSub.submission.score >= 90 ? "#22c55e" : viewSub.submission.score >= 60 ? "var(--accent)" : "#ef4444" }}>
                      {viewSub.submission.score}分
                    </span>
                  )}
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {questions.map((q: any, qi: number) => {
                    const picked = answers[q.id];
                    const correct = q.answer;
                    const isRight = picked === correct;
                    return (
                      <div key={q.id} className="rounded-xl p-3 border" style={{ borderColor: isRight ? "#22c55e" : "#ef4444", background: isRight ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)" }}>
                        <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>{qi + 1}. {q.question}</p>
                        <div className="space-y-1">
                          {q.options.map((opt: string) => {
                            const letter = opt[0];
                            const isCorrectOpt = letter === correct;
                            const isPickedOpt = letter === picked;
                            let color = "var(--muted)";
                            if (isCorrectOpt) color = "#22c55e";
                            else if (isPickedOpt && !isCorrectOpt) color = "#ef4444";
                            return (
                              <div key={opt} className="text-xs px-3 py-1.5 rounded-lg" style={{ color, background: isCorrectOpt ? "rgba(34,197,94,0.1)" : isPickedOpt ? "rgba(239,68,68,0.08)" : "transparent" }}>
                                {opt}{isPickedOpt && !isCorrectOpt ? " ✗（你的选择）" : ""}{isCorrectOpt ? " ✓（正确答案）" : ""}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && <p className="text-xs mt-2 px-2" style={{ color: "var(--muted)" }}>解析：{q.explanation}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: "var(--muted)" }}>提交时间:</span>
                <span className="text-sm" style={{ color: "var(--foreground)" }}>{new Date(viewSub.submission.submitted_at).toLocaleString("zh-CN")}</span>
              </div>
              {viewSub.submission.content && (
                <div>
                  <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>我的回答:</p>
                  <p className="text-sm p-3 rounded-lg" style={{ background: "var(--background)", color: "var(--foreground)" }}>{viewSub.submission.content}</p>
                </div>
              )}
              {viewSub.submission.file_url && (
                <a href={viewSub.submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: "var(--accent)" }}>查看附件</a>
              )}
              {viewSub.submission.score != null && (
                <div>
                  <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>评分:</p>
                  <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{viewSub.submission.score}分</span>
                </div>
              )}
              {viewSub.submission.feedback && (
                <div>
                  <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>老师评语:</p>
                  <p className="text-sm p-3 rounded-lg" style={{ background: "var(--background)", color: "var(--foreground)" }}>{viewSub.submission.feedback}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Quiz assignment modal */}
      <Modal
        open={!!quizAssignment}
        onClose={() => { setQuizAssignment(null); setQuizAnswers({}); }}
        title={quizAssignment?.title ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setQuizAssignment(null); setQuizAnswers({}); }}>取消</Button>
            <Button
              loading={quizSubmitting}
              onClick={handleSubmitQuiz}
              disabled={quizAssignment ? parseQuizQuestions(quizAssignment.description).some((q: any) => !quizAnswers[q.id]) : true}
            >
              提交答案
            </Button>
          </>
        }
      >
        {quizAssignment && (() => {
          const questions = parseQuizQuestions(quizAssignment.description);
          const answered = questions.filter((q: any) => quizAnswers[q.id]).length;
          return (
            <div className="space-y-5">
              <p className="text-xs" style={{ color: "var(--muted)" }}>共 {questions.length} 题 · 已答 {answered} 题</p>
              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                {questions.map((q: any, qi: number) => (
                  <div key={q.id}>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>{qi + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt: string) => {
                        const letter = opt[0];
                        const isPicked = quizAnswers[q.id] === letter;
                        return (
                          <button
                            key={opt}
                            onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: letter }))}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border"
                            style={{
                              background: isPicked ? "rgba(99,102,241,0.12)" : "var(--background)",
                              borderColor: isPicked ? "var(--accent)" : "var(--card-border)",
                              color: isPicked ? "var(--accent)" : "var(--foreground)",
                              fontWeight: isPicked ? 600 : 400,
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
