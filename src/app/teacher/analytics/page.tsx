"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const t = useTranslations();
  const userId = (session?.user as any)?.id;
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [viewData, setViewData] = useState<any[]>([]);
  const [submissionData, setSubmissionData] = useState<any[]>([]);
  const [wrongData, setWrongData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClassAnalytics = async (classId: string) => {
    setLoading(true);

    // Get students in class
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("users(id, name)")
      .eq("class_id", classId);
    const studentList = enrollments?.map((e: any) => e.users).filter(Boolean) ?? [];
    setStudents(studentList);
    const studentIds = studentList.map((s: any) => s.id);

    // Material views per student
    const { data: views } = await supabase
      .from("material_views")
      .select("student_id, duration_seconds, users(name)")
      .in("student_id", studentIds);
    const viewAgg: Record<string, { name: string; minutes: number }> = {};
    views?.forEach((v: any) => {
      if (!viewAgg[v.student_id]) viewAgg[v.student_id] = { name: v.users?.name ?? v.student_id, minutes: 0 };
      viewAgg[v.student_id].minutes += Math.round((v.duration_seconds ?? 0) / 60);
    });
    setViewData(Object.values(viewAgg));

    // Submissions per student (on-time vs late)
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, deadline")
      .eq("class_id", classId);
    const assignmentMap: Record<string, string> = {};
    assignments?.forEach((a: any) => { assignmentMap[a.id] = a.deadline; });

    const { data: subs } = await supabase
      .from("submissions")
      .select("student_id, assignment_id, submitted_at, users(name)")
      .in("student_id", studentIds);
    const subAgg: Record<string, { name: string; onTime: number; late: number }> = {};
    subs?.forEach((s: any) => {
      if (!subAgg[s.student_id]) subAgg[s.student_id] = { name: s.users?.name ?? s.student_id, onTime: 0, late: 0 };
      const deadline = assignmentMap[s.assignment_id];
      if (deadline && new Date(s.submitted_at) <= new Date(deadline)) subAgg[s.student_id].onTime++;
      else subAgg[s.student_id].late++;
    });
    setSubmissionData(Object.values(subAgg));

    // Wrong questions by knowledge point
    const { data: wrong } = await supabase
      .from("wrong_questions")
      .select("knowledge_point, student_id")
      .in("student_id", studentIds);
    const wrongAgg: Record<string, number> = {};
    wrong?.forEach((w: any) => {
      wrongAgg[w.knowledge_point] = (wrongAgg[w.knowledge_point] ?? 0) + 1;
    });
    const wrongArr = Object.entries(wrongAgg)
      .map(([kp, count]) => ({ point: kp.length > 10 ? kp.slice(0, 10) + "…" : kp, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setWrongData(wrongArr);

    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    supabase.from("teacher_classes").select("classes(id, name)").eq("teacher_id", userId).then(({ data }) => {
      const cls = data?.map((tc: any) => tc.classes).filter(Boolean) ?? [];
      setClasses(cls);
      if (cls.length > 0) { setSelectedClass(cls[0].id); loadClassAnalytics(cls[0].id); }
      else setLoading(false);
    });
  }, [userId]);

  const chartTooltipStyle = { background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--foreground)" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("analyticsEx.classTitle")}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("analyticsEx.classSub")}</p>
      </div>

      {classes.length > 0 && (
        <div className="flex gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedClass(c.id); loadClassAnalytics(c.id); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: selectedClass === c.id ? "var(--accent)" : "var(--card)",
                color: selectedClass === c.id ? "#fff" : "var(--foreground)",
                border: `1px solid ${selectedClass === c.id ? "var(--accent)" : "var(--card-border)"}`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("common.loading")}</p></Card>
      ) : students.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("analyticsEx.noStudentData")}</p></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Study time */}
          <Card>
            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("analyticsEx.studyTimeMin")}</h3>
            {viewData.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>{t("analyticsEx.noStudyRecords")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={viewData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} name={t("analytics.minutes")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Submission behaviour */}
          <Card>
            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("analyticsEx.assignmentCompletion")}</h3>
            {submissionData.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>{t("analyticsEx.noSubmissions")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={submissionData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="onTime" fill="#22c55e" radius={[4, 4, 0, 0]} name={t("common.onTime")} />
                  <Bar dataKey="late" fill="#ef4444" radius={[4, 4, 0, 0]} name={t("common.late")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Wrong questions */}
          <Card className="xl:col-span-2">
            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("analyticsEx.top10Mistakes")}</h3>
            {wrongData.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>{t("analyticsEx.noMistakeRecords")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={wrongData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis dataKey="point" type="category" tick={{ fill: "var(--muted)", fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name={t("analyticsEx.mistakeCount")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
