import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { getTranslations } from "next-intl/server";

export default async function TeacherDashboard() {
  const session = await auth();
  const teacherId = (session?.user as any)?.id;
  const db = createAdminClient();
  const t = await getTranslations();

  const [
    { count: assignmentsCount },
    { count: announcementsCount },
    { data: recentSubmissions },
  ] = await Promise.all([
    db.from("assignments").select("*", { count: "exact", head: true }).eq("teacher_id", teacherId),
    db.from("announcements").select("*", { count: "exact", head: true }).eq("teacher_id", teacherId),
    db.from("submissions").select("*, assignments(title), users(name)").order("submitted_at", { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
          {t("dashboard.welcome")}，{session?.user?.name}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("dashboard.workbenchOverview")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: t("dashboard.assignmentsSet"), value: assignmentsCount ?? 0, color: "var(--accent)" },
          { label: t("dashboard.announcementsPublished"), value: announcementsCount ?? 0, color: "#3b82f6" },
          { label: t("dashboard.recentSubmissions"), value: recentSubmissions?.length ?? 0, color: "#10b981" },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{stat.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("dashboard.latestSubmissions")}</h3>
          {recentSubmissions && recentSubmissions.length > 0 ? (
            <div className="space-y-2">
              {recentSubmissions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.users?.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.assignments?.title}</p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(s.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t("dashboard.noSubmissions")}</p>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("common.quickActions")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/teacher/assignments", label: t("dashboard.createAssignment") },
              { href: "/teacher/announcements", label: t("dashboard.publishAnnouncement") },
              { href: "/teacher/grading", label: t("dashboard.autoGrade") },
              { href: "/teacher/ai-preview", label: t("dashboard.generatePreview") },
            ].map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="flex items-center gap-2 p-3 rounded-xl border transition-all hover:scale-[1.02]"
                style={{ borderColor: "var(--card-border)", background: "var(--background)" }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{a.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
