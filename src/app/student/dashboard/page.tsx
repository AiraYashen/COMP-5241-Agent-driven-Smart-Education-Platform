import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const sb = createAdminClient();

  // Get student's class
  const { data: enrollment } = await sb.from("enrollments").select("class_id, classes(name)").eq("student_id", userId).single();
  const classId = enrollment?.class_id;
  const className = (enrollment?.classes as any)?.name ?? "未分配班级";

  // Today's schedule
  const weekday = new Date().getDay(); // 0=Sun
  const dayMap: Record<number, string> = { 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT", 0: "SUN" };
  const today = dayMap[weekday] ?? "MON";
  const { data: todaySchedule } = classId
    ? await sb.from("schedules").select("subject, start_time, end_time, room, users(name)").eq("class_id", classId).eq("weekday", today).order("start_time")
    : { data: [] };

  // Unread announcements
  const { data: allAnnouncements } = classId
    ? await sb.from("announcements").select("id").eq("class_id", classId)
    : { data: [] };
  const annIds = (allAnnouncements ?? []).map((a: any) => a.id);
  let unreadCount = 0;
  if (annIds.length > 0) {
    const { data: reads } = await sb.from("announcement_reads").select("announcement_id").eq("student_id", userId).in("announcement_id", annIds);
    unreadCount = annIds.length - (reads?.length ?? 0);
  }

  // Pending assignments
  const { data: assignments } = classId
    ? await sb.from("assignments").select("id, title, deadline").eq("class_id", classId).gte("deadline", new Date().toISOString()).order("deadline")
    : { data: [] };
  const assignmentIds = (assignments ?? []).map((a: any) => a.id);
  const { data: submitted } = assignmentIds.length > 0
    ? await sb.from("submissions").select("assignment_id").eq("student_id", userId).in("assignment_id", assignmentIds)
    : { data: [] };
  const submittedIds = new Set((submitted ?? []).map((s: any) => s.assignment_id));
  const pending = (assignments ?? []).filter((a: any) => !submittedIds.has(a.id));

  // Recent grades
  const { data: grades } = await sb.from("grades").select("subject, score, created_at").eq("student_id", userId).order("created_at", { ascending: false }).limit(3);

  const stats = [
    { label: "未读公告", value: unreadCount, href: "/student/announcements", color: unreadCount > 0 ? "var(--accent)" : "var(--muted)" },
    { label: "待交作业", value: pending.length, href: "/student/assignments", color: pending.length > 0 ? "#f59e0b" : "var(--muted)" },
    { label: "今日课程", value: (todaySchedule ?? []).length, href: "/student/schedule", color: "#22c55e" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
          你好，{session?.user?.name ?? "同学"}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{className} · {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="text-center hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <Card>
          <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>今日课程</h3>
          {(todaySchedule ?? []).length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>今天没有课，好好休息</p>
          ) : (
            <div className="space-y-2">
              {(todaySchedule ?? []).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                  <div className="text-xs font-mono w-16 flex-shrink-0" style={{ color: "var(--accent)" }}>
                    {s.start_time?.slice(0, 5)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.subject}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{s.room} · {s.users?.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending assignments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>待交作业</h3>
            <Link href="/student/assignments" className="text-xs" style={{ color: "var(--accent)" }}>查看全部 →</Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>暂无待交作业</p>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 4).map((a: any) => {
                const deadline = new Date(a.deadline);
                const diff = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
                return (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{a.title}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{deadline.toLocaleDateString("zh-CN")} 截止</div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: diff <= 1 ? "#fef2f2" : diff <= 3 ? "#fffbeb" : "var(--card)",
                        color: diff <= 1 ? "#ef4444" : diff <= 3 ? "#f59e0b" : "var(--muted)",
                      }}
                    >
                      {diff <= 0 ? "已逾期" : `${diff}天后`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent grades */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>最近成绩</h3>
            <Link href="/student/grades" className="text-xs" style={{ color: "var(--accent)" }}>查看全部 →</Link>
          </div>
          {(grades ?? []).length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>暂无成绩记录</p>
          ) : (
            <div className="space-y-2">
              {(grades ?? []).map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>{g.subject}</span>
                  <span className="text-lg font-bold" style={{ color: g.score >= 90 ? "#22c55e" : g.score >= 60 ? "var(--accent)" : "#ef4444" }}>
                    {g.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick links */}
        <Card>
          <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>快速入口</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/student/ai-chat", label: "AI 学习助手", desc: "问问 AI 不懂的知识" },
              { href: "/student/materials", label: "学习资料", desc: "查看老师上传的课件" },
              { href: "/student/discussion", label: "讨论区", desc: "向同学、老师提问" },
              { href: "/student/analytics", label: "学习报告", desc: "了解自己的学习情况" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className="p-3 rounded-xl border hover:border-[var(--accent)] transition-all cursor-pointer"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                >
                  <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{item.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
