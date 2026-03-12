"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button } from "@/components/ui";
import { useSession } from "next-auth/react";

export default function StudentGradesPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ analysis: string; suggestions: string[]; practice: string } | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  useEffect(() => {
    if (!userId) return;
    supabase.from("grades").select("subject, score, exam_name, total_score, created_at").eq("student_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => { setGrades(data ?? []); setLoading(false); });
  }, [userId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError("");
    setAnalysis(null);
    const points = grades.map((g) => `${g.subject}: ${g.score}`).join("\n");
    try {
      const res = await fetch("/api/student/analyze-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades: points, studentName: session?.user?.name }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnalysis(await res.json());
    } catch (err: any) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const avg = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length) : null;
  const maxScore = grades.length > 0 ? Math.max(...grades.map((g) => g.score)) : null;
  const minScore = grades.length > 0 ? Math.min(...grades.map((g) => g.score)) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>我的成绩</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>共 {grades.length} 条成绩记录</p>
      </div>

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>加载中...</p></Card>
      ) : grades.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无成绩</p></Card>
      ) : (
        <>
          {/* Summary */}
          {avg !== null && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "平均分", value: avg, color: avg >= 90 ? "#22c55e" : avg >= 60 ? "var(--accent)" : "#ef4444" },
                { label: "最高分", value: maxScore, color: "#22c55e" },
                { label: "最低分", value: minScore, color: (minScore ?? 0) < 60 ? "#ef4444" : "var(--muted)" },
              ].map((s) => (
                <Card key={s.label} className="text-center">
                  <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Grade list */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                    {["科目", "分数", "考试名称", "满分", "日期"].map((h) => (
                      <th key={h} className="text-left text-xs py-2 pr-4 font-semibold" style={{ color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--foreground)" }}>{g.subject}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="inline-block min-w-[3rem] text-center px-2 py-1 rounded-lg text-sm font-bold"
                          style={{
                            background: g.score >= 90 ? "#dcfce7" : g.score >= 60 ? "var(--accent-light, #fff3ec)" : "#fee2e2",
                            color: g.score >= 90 ? "#16a34a" : g.score >= 60 ? "var(--accent)" : "#dc2626",
                          }}
                        >
                          {g.score}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm" style={{ color: "var(--muted)" }}>{g.exam_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-sm" style={{ color: "var(--muted)" }}>{g.total_score ?? 100}</td>
                      <td className="py-3 text-sm" style={{ color: "var(--muted)" }}>{new Date(g.created_at).toLocaleDateString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* AI Analysis */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>AI 薄弱点分析</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>基于你的成绩，AI 为你分析学习薄弱点并给出建议</p>
              </div>
              <Button size="sm" onClick={handleAnalyze} loading={analyzing}>开始分析</Button>
            </div>

            {analyzeError && <p className="text-sm text-red-500">{analyzeError}</p>}

            {analysis && (
              <div className="space-y-3 mt-3">
                <div className="p-3 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>综合分析</p>
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>{analysis.analysis}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#22c55e" }}>学习建议</p>
                  <ul className="space-y-1">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span style={{ color: "var(--accent)" }}>•</span>
                        <span style={{ color: "var(--foreground)" }}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "#f59e0b" }}>建议练习方向</p>
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>{analysis.practice}</p>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
