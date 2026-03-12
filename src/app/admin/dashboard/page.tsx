import { createAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui";

export default async function AdminDashboard() {
  const db = createAdminClient();
  const [
    { count: schoolsCount },
    { count: classesCount },
    { count: usersCount },
  ] = await Promise.all([
    db.from("schools").select("*", { count: "exact", head: true }),
    db.from("classes").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "学校数量", value: schoolsCount ?? 0, color: "var(--accent)" },
    { label: "班级数量", value: classesCount ?? 0, color: "#3b82f6" },
    { label: "用户总数", value: usersCount ?? 0, color: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>管理后台</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>系统概览与数据统计</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
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

      <Card>
        <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>快捷操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/schools", label: "添加学校" },
            { href: "/admin/classes", label: "添加班级" },
            { href: "/admin/users", label: "添加用户" },
            { href: "/admin/schedule", label: "配置课表" },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ borderColor: "var(--card-border)", background: "var(--background)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{action.label}</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
