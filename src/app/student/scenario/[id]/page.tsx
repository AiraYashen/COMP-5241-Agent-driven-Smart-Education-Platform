"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface Chapter {
  chapter: number;
  title: string;
  narrative: string;
  narrator_hint: string;
  choices: { key: string; text: string; hint?: string }[];
  is_final?: boolean;
}

interface RealitySyncReport {
  student_outcome: string;
  real_history: string;
  key_difference: string;
  reflection: string;
  score: number;
}

interface ScenarioMeta {
  title: string;
  subjectIcon: string;
  role: string;
  narratorName: string;
  totalChapters: number;
  saveName: string;
}

export default function ScenarioSimPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session");

  const [meta, setMeta] = useState<ScenarioMeta | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [textDone, setTextDone] = useState(false);
  const [report, setReport] = useState<RealitySyncReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const textRef = useRef("");

  // Redirect to hub if no session param
  useEffect(() => {
    if (!sessionId) {
      router.replace("/student/scenario");
    }
  }, [sessionId, router]);

  // Typewriter effect
  useEffect(() => {
    if (!chapter) return;
    const full = chapter.narrative ?? "";
    textRef.current = full;
    setDisplayedText("");
    setTextDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayedText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(iv);
        setTextDone(true);
      }
    }, 22);
    return () => clearInterval(iv);
  }, [chapter]);

  // Load session on mount
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch("/api/student/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load", sessionId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        setMeta({
          title: d.scenarioTitle ?? "",
          subjectIcon: d.scenarioSubjectIcon ?? "历",
          role: d.scenarioRole ?? "",
          narratorName: d.scenarioNarratorName ?? "",
          totalChapters: d.totalChapters ?? 5,
          saveName: d.saveName ?? "",
        });
        setChapter(d.chapter);
        setImageUrl(d.imageUrl ?? null);
        if (d.completed) {
          setIsGameOver(true);
          if (d.report) {
            setReport(d.report);
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const makeChoice = async (choiceKey: string, customText?: string) => {
    if (!sessionId) return;
    setChoosing(true);
    setShowCustomInput(false);
    setCustomInput("");
    const res = await fetch("/api/student/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "choice", sessionId, choiceKey, customText }),
    });
    const data = await res.json();
    setChapter(data.chapter);
    setImageUrl(data.imageUrl ?? null);
    if (data.isFinal) {
      setIsGameOver(true);
      setLoadingReport(true);
      const r2 = await fetch("/api/student/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", sessionId }),
      });
      const d2 = await r2.json();
      setReport(d2.report);
      setLoadingReport(false);
    }
    setChoosing(false);
  };

  if (!sessionId) return null;

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-slate-900">
        <div className="text-center">
          <p className="text-xl mb-4">存档不存在或已失效</p>
          <button className="px-4 py-2 bg-indigo-600 rounded-lg" onClick={() => router.push("/student/scenario")}>
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-950 text-white gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full" />
        <p className="text-slate-300">正在打开时空之门…</p>
      </div>
    );
  }

  const totalChapters = meta?.totalChapters ?? 5;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <button onClick={() => router.push("/student/scenario")} className="text-slate-400 hover:text-white text-sm">
          ← 退出模拟
        </button>
        <div className="text-center">
          <span className="text-white font-semibold">
            {meta?.subjectIcon} {meta?.title}
          </span>
          {meta?.saveName && (
            <span className="ml-2 text-xs text-slate-500">{meta.saveName}</span>
          )}
        </div>
        <div className="text-slate-400 text-sm">{meta?.role}</div>
      </div>

      {/* Chapter progress */}
      <div className="flex items-center gap-2 px-6 py-3">
        {Array.from({ length: totalChapters }).map((_, i) => {
          const current = chapter?.chapter ?? 1;
          return (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i + 1 < current ? "bg-indigo-500" : i + 1 === current ? "bg-indigo-300" : "bg-white/10"
              }`}
            />
          );
        })}
        <span className="text-slate-400 text-xs ml-2 whitespace-nowrap">
          第 {chapter?.chapter ?? 1}/{totalChapters} 章
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 relative">
        {/* Narrative panel */}
        <div className="flex-1 px-8 py-6 flex flex-col gap-4">
          {chapter && (
            <>
              <h2 className="text-2xl font-bold text-white">{chapter.title}</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest">
                — {meta?.narratorName}
              </p>
              {imageUrl && (
                <div className="w-full rounded-xl overflow-hidden border border-white/10 bg-white/5" style={{ maxHeight: 240 }}>
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt={chapter.title}
                    className="w-full h-full object-cover transition-opacity duration-500"
                    style={{ maxHeight: 240 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-slate-200 leading-loose text-base min-h-[180px]">
                {displayedText}
                {!textDone && <span className="animate-pulse">▌</span>}
              </div>
              {chapter.narrator_hint && (
                <div className="text-sm text-indigo-300 italic">{chapter.narrator_hint}</div>
              )}
            </>
          )}
        </div>

        {/* Choices panel */}
        <div className="lg:w-80 px-6 py-6 flex flex-col gap-4 border-l border-white/10">
          {isGameOver ? (
            <>
              <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">情景已结束</p>
                  <p className="text-slate-400 text-sm mt-1">所有章节已完成</p>
                </div>
                {loadingReport ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full" />
                    正在生成报告…
                  </div>
                ) : (
                  <>
                    {report && (
                      <button
                        onClick={() => setShowReport(true)}
                        className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition"
                      >
                        查看 Reality Sync 报告
                      </button>
                    )}
                    <button
                      onClick={() => router.push("/student/scenario")}
                      className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                    >
                      返回大厅
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">你的抉择</p>
              {chapter?.choices?.map((c) => (
                <button
                  key={c.key}
                  disabled={choosing || !textDone}
                  onClick={() => makeChoice(c.key)}
                  className="text-left bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500 rounded-xl p-4 transition disabled:opacity-40"
                >
                  <span className="text-indigo-400 font-bold text-lg mr-2">{c.key}.</span>
                  <span className="text-white">{c.text}</span>
                  {c.hint && <p className="text-xs text-slate-400 mt-1">{c.hint}</p>}
                </button>
              ))}
              {/* Option D: Custom input */}
              {!showCustomInput ? (
                <button
                  disabled={choosing || !textDone}
                  onClick={() => setShowCustomInput(true)}
                  className="text-left bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500 rounded-xl p-4 transition disabled:opacity-40"
                >
                  <span className="text-indigo-400 font-bold text-lg mr-2">D.</span>
                  <span className="text-white">其他：______</span>
                </button>
              ) : (
                <div className="bg-white/5 border border-indigo-500 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold text-lg">D.</span>
                    <span className="text-white text-sm">其他</span>
                  </div>
                  <textarea
                    autoFocus
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="请输入你的想法…"
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowCustomInput(false); setCustomInput(""); }}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white transition"
                    >
                      取消
                    </button>
                    <button
                      disabled={!customInput.trim() || choosing}
                      onClick={() => makeChoice("D", customInput.trim())}
                      className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40 transition"
                    >
                      提交
                    </button>
                  </div>
                </div>
              )}
              {choosing && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full" />
                  时空正在重构…
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reality Sync Modal */}
      {showReport && report && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-8 space-y-5 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold text-white text-center">Reality Sync 现实对比</h2>
            <div className="text-center">
              <span className="text-5xl font-black text-indigo-400">{report.score}</span>
              <p className="text-slate-400 text-sm">决策质量评分（满分100）</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-900/40 rounded-xl p-4">
                <p className="text-xs text-indigo-400 uppercase font-semibold mb-2">你的历史走向</p>
                <p className="text-slate-200 text-sm leading-relaxed">{report.student_outcome}</p>
              </div>
              <div className="bg-amber-900/30 rounded-xl p-4">
                <p className="text-xs text-amber-400 uppercase font-semibold mb-2">真实历史</p>
                <p className="text-slate-200 text-sm leading-relaxed">{report.real_history}</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold mb-1">关键差异</p>
              <p className="text-slate-200 text-sm">{report.key_difference}</p>
            </div>
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4">
              <p className="text-xs text-green-400 font-semibold mb-1">给你的反思</p>
              <p className="text-slate-200 text-sm">{report.reflection}</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => router.push("/student/scenario")}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                返回大厅
              </button>
              <button
                onClick={() => setShowReport(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
