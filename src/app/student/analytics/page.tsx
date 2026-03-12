"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

export default function StudentAnalyticsPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [grades, setGrades] = useState<any[]>([]);
  const [viewData, setViewData] = useState<any[]>([]);
  const [wrongData, setWrongData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: g }, { data: v }, { data: w }] = await Promise.all([
        supabase.from("grades").select("subject, score").eq("student_id", userId),
        supabase.from("material_views").select("viewed_at, duration_seconds").eq("student_id", userId).order("viewed_at", { ascending: false }).limit(30),
        supabase.from("wrong_questions").select("knowledge_point, subject").eq("student_id", userId),
      ]);

      // Radar: subject scores
      const scoreMap: Record<string, number[]> = {};
      (g ?? []).forEach((gr: any) => {
        if (!scoreMap[gr.subject]) scoreMap[gr.subject] = [];
        scoreMap[gr.subject].push(gr.score);
      });
      const radarArr = Object.entries(scoreMap).map(([subject, scores]) => ({
        subject,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        fullMark: 100,
      }));
      setGrades(radarArr);

      // Bar: daily study minutes (last 14 days)
      type DayRecord = { date: string; minutes: number };
      const dayAgg: Record<string, DayRecord> = {};
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
        dayAgg[key] = { date: key, minutes: 0 };
      }
      (v ?? []).forEach((view: any) => {
        const key = new Date(view.viewed_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
        if (dayAgg[key]) dayAgg[key].minutes += Math.round((view.duration_seconds ?? 0) / 60);
      });
      setViewData(Object.values(dayAgg));

      // Wrong questions by knowledge point
      const wpMap: Record<string, number> = {};
      (w ?? []).forEach((wq: any) => { wpMap[wq.knowledge_point] = (wpMap[wq.knowledge_point] ?? 0) + 1; });
      const wpArr = Object.entries(wpMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([kp, cnt]) => ({ point: kp.length > 8 ? kp.slice(0, 8) + "…" : kp, count: cnt }));
      setWrongData(wpArr);

      setLoading(false);
    };
    load();
  }, [userId]);

  const tooltipStyle = { background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--foreground)" };
  const totalStudyMins = viewData.reduce((s, d) => s + d.minutes, 0);
  const avgScore = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length) : null;
  const wrongTotal = wrongData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("analyticsEx.reportTitle")}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("analyticsEx.reportSub")}</p>
      </div>

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("common.loading")}</p></Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("analyticsEx.last14Days"), value: totalStudyMins > 0 ? `${totalStudyMins}${t("analytics.minutes")}` : "—", color: "var(--accent)" },
              { label: t("analyticsEx.overallAverage"), value: avgScore !== null ? `${avgScore}` : "—", color: avgScore && avgScore >= 90 ? "#22c55e" : "var(--accent)" },
              { label: t("analyticsEx.totalMistakes"), value: wrongTotal > 0 ? `${wrongTotal}` : "—", color: wrongTotal > 10 ? "#ef4444" : "#f59e0b" },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar */}
            <Card>
              <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("analytics.radar")}</h3>
              {grades.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>{t("analyticsEx.noGradesData")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={grades}>
                    <PolarGrid stroke="var(--card-border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <Radar name={t("gradesEx.average")} dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Study time bar */}
            <Card>
              <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("analyticsEx.last14Days")}</h3>
              {viewData.every((d) => d.minutes === 0) ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>{t("analyticsEx.noStudyRecords")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={viewData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} name={t("analytics.minutes")} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Wrong questions */}
            {wrongData.length > 0 && (
              <Card className="lg:col-span-2">
                <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("analyticsEx.commonMistakes")}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={wrongData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <YAxis dataKey="point" type="category" tick={{ fill: "var(--muted)", fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name={t("analyticsEx.mistakeCount")} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
