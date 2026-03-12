import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { getTranslations, getMessages } from "next-intl/server";

const DAYS = [1, 2, 3, 4, 5] as const;
const SUBJECT_COLORS: Record<string, string> = {
  语文: "#ef4444", 数学: "#3b82f6", 英语: "#22c55e", 物理: "#a855f7",
  化学: "#f59e0b", 生物: "#06b6d4", 历史: "#f97316", 地理: "#84cc16",
  政治: "#ec4899", 体育: "#14b8a6",
};
const colorFor = (subject: string) => {
  for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
    if (subject.includes(k)) return v;
  }
  const h = [...subject].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${h}, 60%, 55%)`;
};

export default async function StudentSchedulePage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const sb = createAdminClient();
  const t = await getTranslations();
  const messages = await getMessages();
  const weekDays = ((messages as any).schedule?.weekDays ?? ["周一","周二","周三","周四","周五"]) as string[];
  const DAY_LABELS: Record<number, string> = { 1: weekDays[0], 2: weekDays[1], 3: weekDays[2], 4: weekDays[3], 5: weekDays[4] };

  const { data: enrollment } = await sb.from("enrollments").select("class_id, classes(name)").eq("student_id", userId).single();
  const classId = enrollment?.class_id;
  const className = (enrollment?.classes as any)?.name ?? t("dashboard.noClass");

  const { data: schedules } = classId
    ? await sb.from("schedules").select("weekday, time_start, time_end, subject, room, users(name), week_type").eq("class_id", classId).order("time_start")
    : { data: [] };

  const grouped: Record<number, any[]> = {};
  DAYS.forEach((d) => (grouped[d] = []));
  (schedules ?? []).forEach((s: any) => { if (grouped[s.weekday]) grouped[s.weekday].push(s); });

  const todayWeekday = new Date().getDay(); // 0=Sun,1=Mon,...6=Sat

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("scheduleEx.mySchedule")}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{className}</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {DAYS.map((d) => (
          <div key={d}>
            <div
              className="text-center text-sm font-semibold py-2 rounded-t-xl mb-2"
              style={{
                background: d === todayWeekday ? "var(--accent)" : "var(--card)",
                color: d === todayWeekday ? "#fff" : "var(--muted)",
              }}
            >
              {DAY_LABELS[d]}
            </div>
            <div className="space-y-2">
              {grouped[d].length === 0 ? (
                <div
                  className="text-xs text-center py-4 rounded-xl"
                  style={{ background: "var(--background)", color: "var(--muted)", border: "1px dashed var(--card-border)" }}
                >
                  {t("schedule.noClass")}
                </div>
              ) : (
                grouped[d].map((s: any, i: number) => {
                  const color = colorFor(s.subject);
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-2.5"
                      style={{ background: color + "18", borderLeft: `3px solid ${color}` }}
                    >
                      <div className="text-xs font-bold" style={{ color }}>{s.subject}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {s.time_start?.slice(0, 5)}–{s.time_end?.slice(0, 5)}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.room}</div>
                      {s.users?.name && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.users.name}</div>
                      )}
                      {s.week_type && s.week_type !== "BOTH" && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          {s.week_type === "ODD" ? "单周" : "双周"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
