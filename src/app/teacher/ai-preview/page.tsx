"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { Card, Button, Modal } from "@/components/ui";
import mermaid from "mermaid";

type Tab = "overview" | "slides" | "mindmap" | "quiz";
interface Slide { index: number; title: string; content: string; bullets: string[] }
interface QuizQ { id: number; type: string; question: string; options: string[]; answer: string; explanation: string }

export default function AiPreviewPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [tab, setTab] = useState<Tab>("overview");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Results
  const [overview, setOverview] = useState<{ title: string; summary: string; lessonUrl: string } | null>(null);
  const [slides, setSlides] = useState<{ title: string; slides: Slide[] } | null>(null);
  const [mindmapCode, setMindmapCode] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<{ title: string; questions: QuizQ[] } | null>(null);

  // Quiz / slide state
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [publishModal, setPublishModal] = useState(false);
  const [publishingQuiz, setPublishingQuiz] = useState(false);
  const [publishClass, setPublishClass] = useState("");
  const [publishSubject, setPublishSubject] = useState("");
  const [publishDeadline, setPublishDeadline] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [published, setPublished] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      supabase.from("teacher_classes").select("classes(id,name)").eq("teacher_id", userId)
        .then(({ data }) => setClasses(data?.map((tc: any) => tc.classes).filter(Boolean) ?? []));
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "mindmap" && mindmapCode && mermaidRef.current) {
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
      mermaidRef.current.innerHTML = "";
      mermaid.render("mindmap-svg-" + Date.now(), mindmapCode).then(({ svg }) => {
        if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
      }).catch(() => {
        if (mermaidRef.current) mermaidRef.current.innerHTML =
          `<pre style="color:var(--muted);font-size:12px;white-space:pre-wrap">${mindmapCode}</pre>`;
      });
    }
  }, [tab, mindmapCode]);

  const getInputText = async (): Promise<string> => {
    if (inputMode === "file" && file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "txt" || ext === "md") {
        try { return await file.text(); } catch { /* fallback */ }
      }
      return `文件名: ${file.name}\n请根据此文件名推断课程主题，生成对应内容。`;
    }
    return text.trim();
  };

  const handleGenerate = async () => {
    const inputText = await getInputText();
    if (!inputText) { setError("请输入内容或选择文件"); return; }
    setGenerating(true);
    setError("");
    setRevealed(false);
    setSelected({});
    setSlideIdx(0);

    const endpoints: Record<Tab, string> = {
      overview: "/api/teacher/ai-preview",
      slides: "/api/teacher/generate-slides",
      mindmap: "/api/teacher/generate-mindmap",
      quiz: "/api/teacher/generate-quiz",
    };

    try {
      const res = await fetch(endpoints[tab], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: inputText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (tab === "overview") {
        setOverview(data);
        if (userId) supabase.from("preview_videos").insert({ teacher_id: userId, summary_text: `${data.title}\n\n${data.summary}` });
      } else if (tab === "slides") { setSlides(data); }
      else if (tab === "mindmap") { setMindmapCode(data.code); }
      else if (tab === "quiz") { setQuiz(data); setPublished(false); }
    } catch (err: any) {
      setError(err.message ?? "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (!quiz || !publishClass || !publishSubject) return;
    setPublishingQuiz(true);
    // Store quiz data as structured JSON so the student side can render interactive MCQs
    const description = `__QUIZ__:${JSON.stringify(quiz.questions)}`;
    await supabase.from("assignments").insert({
      teacher_id: userId, class_id: publishClass, subject: publishSubject,
      title: quiz.title, description, deadline: publishDeadline || null,
    });
    setPublishingQuiz(false);
    setPublishModal(false);
    setPublished(true);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "课程概述", icon: "" },
    { key: "slides", label: "幻灯片", icon: "" },
    { key: "mindmap", label: "思维导图", icon: "" },
    { key: "quiz", label: "互动题目", icon: "" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>AI 教学工坊</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>输入教学材料，一键生成课程概述、幻灯片、思维导图或互动测验</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(""); }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? "var(--accent)" : "var(--card-bg,var(--background))",
              color: tab === t.key ? "#fff" : "var(--muted)",
              border: `1px solid ${tab === t.key ? "var(--accent)" : "var(--card-border)"}`,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Input Card */}
      <Card>
        <div className="flex gap-2 mb-4">
          {(["text", "file"] as const).map((m) => (
            <button key={m} onClick={() => setInputMode(m)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: inputMode === m ? "var(--accent)" : "var(--background)",
                color: inputMode === m ? "#fff" : "var(--muted)",
                border: `1px solid ${inputMode === m ? "var(--accent)" : "var(--card-border)"}`,
              }}>
              {m === "text" ? "文本输入" : "上传文件"}
            </button>
          ))}
        </div>

        {inputMode === "text" ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
            placeholder="粘贴教案、课文、知识点概要…"
            className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }} />
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 cursor-pointer"
            style={{ borderColor: "var(--card-border)", background: "var(--background)" }}>
            <input type="file" className="hidden" accept=".pdf,.pptx,.ppt,.docx,.txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{file ? file.name : "点击选择文件"}</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>支持 PDF、PPT、Word、TXT、Markdown</p>
          </label>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="flex justify-end mt-4">
          <Button onClick={handleGenerate} loading={generating}
            disabled={inputMode === "text" ? !text.trim() : !file}>
            {generating ? "AI 生成中…" : `生成${TABS.find((t) => t.key === tab)?.label ?? ""}`}
          </Button>
        </div>
      </Card>

      {/* ── Overview Result ── */}
      {tab === "overview" && overview && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{overview.title}</h3>
              <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}>AI 生成</span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-xl"
              style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--card-border)" }}>
              {overview.summary}
            </div>
            <div className="flex gap-3">
              <a href={overview.lessonUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: "var(--accent)" }}>
                进入 AI 微课
              </a>
              <button onClick={() => { setOverview(null); setText(""); setFile(null); }}
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: "var(--background)", color: "var(--muted)", border: "1px solid var(--card-border)" }}>
                重新生成
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Slides Result ── */}
      {tab === "slides" && slides && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{slides.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "var(--muted)" }}>{slideIdx + 1} / {slides.slides.length}</span>
              <button onClick={() => setSlideIdx((i) => Math.max(0, i - 1))} disabled={slideIdx === 0}
                className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 transition-opacity"
                style={{ border: "1px solid var(--card-border)", color: "var(--foreground)", background: "var(--background)" }}>←</button>
              <button onClick={() => setSlideIdx((i) => Math.min(slides.slides.length - 1, i + 1))}
                disabled={slideIdx === slides.slides.length - 1}
                className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 transition-opacity"
                style={{ border: "1px solid var(--card-border)", color: "var(--foreground)", background: "var(--background)" }}>→</button>
            </div>
          </div>
          {(() => {
            const s = slides.slides[slideIdx];
            return (
              <Card>
                <div className="min-h-[260px] flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                      Slide {s.index}
                    </div>
                    <h4 className="text-2xl font-bold mb-3" style={{ color: "var(--foreground)" }}>{s.title}</h4>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--muted)" }}>{s.content}</p>
                    <ul className="space-y-2">
                      {s.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--foreground)" }}>
                          <span className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: "var(--accent)" }}>{i + 1}</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-1.5 mt-6 justify-center">
                    {slides.slides.map((_, i) => (
                      <button key={i} onClick={() => setSlideIdx(i)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === slideIdx ? "var(--accent)" : "var(--card-border)" }} />
                    ))}
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ── Mindmap Result ── */}
      {tab === "mindmap" && mindmapCode && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>思维导图</h3>
            <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}>AI 生成</span>
          </div>
          <div ref={mermaidRef} className="overflow-x-auto flex justify-center" style={{ minHeight: 200 }} />
        </Card>
      )}

      {/* ── Quiz Result ── */}
      {tab === "quiz" && quiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{quiz.title}</h3>
            <div className="flex gap-2 flex-wrap">
              {published && <span className="text-sm px-3 py-1.5 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>已发布</span>}
              <Button variant="secondary" onClick={() => { setPublished(false); setPublishModal(true); }}>发布为作业</Button>
              <Button variant="ghost" onClick={() => setRevealed(!revealed)}>{revealed ? "隐藏答案" : "查看答案"}</Button>
            </div>
          </div>
          <div className="space-y-4">
            {quiz.questions.map((q, qi) => (
              <Card key={q.id}>
                <p className="font-medium mb-3" style={{ color: "var(--foreground)" }}>{qi + 1}. {q.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => {
                    const letter = opt[0];
                    const isCorrect = letter === q.answer;
                    const isSelected = selected[q.id] === letter;
                    let borderColor = "var(--card-border)";
                    let bg = "var(--background)";
                    if (revealed && isCorrect) { bg = "rgba(34,197,94,0.1)"; borderColor = "#22c55e"; }
                    else if (revealed && isSelected && !isCorrect) { bg = "rgba(239,68,68,0.08)"; borderColor = "#ef4444"; }
                    return (
                      <button key={opt} onClick={() => setSelected((s) => ({ ...s, [q.id]: letter }))}
                        className="text-left px-4 py-2.5 rounded-xl text-sm transition-all border"
                        style={{ background: bg, borderColor, color: "var(--foreground)" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {revealed && (
                  <div className="mt-3 p-3 rounded-lg text-xs"
                    style={{ background: "rgba(34,197,94,0.06)", color: "var(--muted)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    {q.explanation}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Publish Quiz Modal */}
      <Modal open={publishModal} onClose={() => setPublishModal(false)} title="发布为作业"
        footer={<><Button variant="secondary" onClick={() => setPublishModal(false)}>取消</Button>
          <Button loading={publishingQuiz} onClick={handlePublishQuiz} disabled={!publishClass || !publishSubject}>发布</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>班级 *</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              value={publishClass} onChange={(e) => setPublishClass(e.target.value)}>
              <option value="">-- 选择班级 --</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>科目 *</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              value={publishSubject} onChange={(e) => setPublishSubject(e.target.value)} placeholder="如：数学" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>截止时间（可选）</label>
            <input type="datetime-local" className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              value={publishDeadline} onChange={(e) => setPublishDeadline(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
