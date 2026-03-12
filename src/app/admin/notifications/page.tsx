"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { useSession } from "next-auth/react";

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT_REMINDER: "公告提醒",
  GRADE_PUBLISHED: "成绩发布",
  ASSIGNMENT: "作业通知",
};

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setNotifications(data ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>消息通知</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {unreadCount > 0
              ? <span style={{ color: "var(--accent)" }}>{unreadCount} 条未读</span>
              : "全部已读"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            全部标为已读
          </button>
        )}
      </div>

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>加载中...</p></Card>
      ) : notifications.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无通知</p></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className="cursor-pointer"
              onClick={() => { if (!n.is_read) markRead(n.id); }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: n.is_read ? "var(--muted)" : "var(--accent)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{n.title}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--background)", color: "var(--muted)", border: "1px solid var(--card-border)" }}
                    >
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    {!n.is_read && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        新
                      </span>
                    )}
                  </div>
                  {n.content && (
                    <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{n.content}</p>
                  )}
                  <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
                    {new Date(n.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
