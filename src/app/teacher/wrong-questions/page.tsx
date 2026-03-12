"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

interface WrongItem {
  knowledge_point: string;
  count: number;
  subject: string;
}

export default function WrongQuestionsPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const teacherId = (session?.user as any)?.id;
  const [items, setItems] = useState<WrongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [practice, setPractice] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    supabase
      .from("wrong_questions")
      .select("knowledge_point, subject, assignments!inner(teacher_id)")
      .eq("assignments.teacher_id", teacherId)
      .then(({ data }) => {
        const map: Record<string, WrongItem> = {};
        (data ?? []).forEach((d: any) => {
          const key = `${d.subject}::${d.knowledge_point}`;
          if (!map[key]) map[key] = { knowledge_point: d.knowledge_point, subject: d.subject, count: 0 };
          map[key].count++;
        });
        setItems(Object.values(map).sort((a, b) => b.count - a.count));
        setLoading(false);
      });
  }, [teacherId]);

  const handleAnalyze = async () => {
    setAnalysisLoading(true);
    const topPoints = items.slice(0, 10).map((i) => `${i.subject}: ${i.knowledge_point}(${i.count}次)`).join("、");
    const res = await fetch("/api/teacher/analyze-weak-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: topPoints }),
    });
    const data = await res.json();
    setAnalysis(data.analysis);
    setPractice(data.practice);
    setAnalysisLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("wrongQuestions.title")}</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("wrongQuestionsEx.manageSub")}</p>
        </div>
        <Button onClick={handleAnalyze} loading={analysisLoading} disabled={items.length === 0}>
        {t("wrongQuestionsEx.analyzeBtn")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("wrongQuestionsEx.frequencyRank")}</h3>
          {loading ? (
            <p className="text-center py-4" style={{ color: "var(--muted)" }}>{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("wrongQuestionsEx.noMistakes")}</p>
          ) : (
            <div className="space-y-3">
              {items.slice(0, 15).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ background: i < 3 ? "var(--accent)" : "var(--muted)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{item.knowledge_point}</span>
                      <span className="text-xs ml-2 flex-shrink-0" style={{ color: "var(--muted)" }}>{item.subject} · {item.count}{t("wrongQuestionsEx.times")}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--background)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(item.count / (items[0]?.count || 1)) * 100}%`, background: "var(--accent)" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {analysis && (
            <Card>
              <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>{t("wrongQuestions.aiAnalysis")}</h3>
              <div className="text-sm whitespace-pre-line" style={{ color: "var(--muted)" }}>{analysis}</div>
            </Card>
          )}
          {practice && (
            <Card>
              <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>{t("wrongQuestionsEx.generatePractice")}</h3>
              <div className="text-sm whitespace-pre-line" style={{ color: "var(--foreground)" }}>{practice}</div>
            </Card>
          )}
          {!analysis && !practice && (
            <Card>
              <div className="flex items-center justify-center h-40" style={{ color: "var(--muted)" }}>
                <div className="text-center">
                  <p className="text-sm">{t("wrongQuestionsEx.analysisHint")}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
