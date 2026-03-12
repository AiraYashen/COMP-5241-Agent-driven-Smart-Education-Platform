import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui";

const weekDays = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

interface Schedule {
  id: string;
  subject: string;
  weekday: number;
  time_start: string;
  time_end: string;
  room: string | null;
  classes: { name: string };
}

export default async function TeacherSchedulePage() {
  const session = await auth();
  const teacherId = (session?.user as any)?.id;
  const db = createAdminClient();

  const { data: schedules } = await db
    .from("schedules")
    .select("*, classes(name)")
    .eq("teacher_id", teacherId)
    .order("weekday")
    .order("time_start");

  const grouped: Record<number, Schedule[]> = {};
  for (let i = 1; i <= 5; i++) grouped[i] = [];
  (schedules ?? []).forEach((s: any) => {
    if (grouped[s.weekday]) grouped[s.weekday].push(s);
  });

  const subjectColors = ["#e86c00", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
  const colorMap: Record<string, string> = {};
  let colorIdx = 0;
  (schedules ?? []).forEach((s: any) => {
    if (!colorMap[s.subject]) {
      colorMap[s.subject] = subjectColors[colorIdx % subjectColors.length];
      colorIdx++;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>我的课表</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>本学期排班安排</p>
      </div>

      <Card>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((day) => (
            <div key={day}>
              <div
                className="text-center text-sm font-semibold mb-3 py-2 rounded-lg"
                style={{ background: "var(--background)", color: "var(--foreground)" }}
              >
                {weekDays[day]}
              </div>
              <div className="space-y-2">
                {grouped[day].length === 0 ? (
                  <div className="text-xs text-center py-4 rounded-lg border border-dashed" style={{ color: "var(--muted)", borderColor: "var(--card-border)" }}>暂无课程</div>
                ) : (
                  grouped[day].map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl text-white text-xs space-y-1"
                      style={{ background: colorMap[s.subject] + "cc" }}
                    >
                      <div className="font-semibold">{s.subject}</div>
                      <div className="opacity-90">{s.classes?.name}</div>
                      <div className="opacity-75">{s.time_start} – {s.time_end}</div>
                      {s.room && <div className="opacity-75">{s.room}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
