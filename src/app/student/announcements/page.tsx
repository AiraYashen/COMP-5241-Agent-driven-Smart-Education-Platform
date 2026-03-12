"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { useSession } from "next-auth/react";

export default function StudentAnnouncementsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      // Get class
      const { data: enrollment } = await supabase.from("enrollments").select("class_id").eq("student_id", userId).single();
      const classId = enrollment?.class_id;
      if (!classId) { setLoading(false); return; }

      // Get announcements
      const { data: anns } = await supabase
        .from("announcements")
        .select("id, title, content, created_at, users(name)")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      // Get reads
      const annIds = (anns ?? []).map((a: any) => a.id);
      const { data: reads } = annIds.length > 0
        ? await supabase.from("announcement_reads").select("announcement_id").eq("student_id", userId).in("announcement_id", annIds)
        : { data: [] };
      const readSet = new Set((reads ?? []).map((r: any) => r.announcement_id));

      setAnnouncements((anns ?? []).map((a: any) => ({ ...a, isRead: readSet.has(a.id) })));
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleOpen = async (id: string, isRead: boolean) => {
    setExpanded(expanded === id ? null : id);
    if (!isRead) {
      await supabase.from("announcement_reads").upsert({ student_id: userId, announcement_id: id });
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a));
    }
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>公告通知</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          {unreadCount > 0 ? <span style={{ color: "var(--accent)" }}>{unreadCount} 条未读</span> : "全部已读"}
        </p>
      </div>

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>加载中...</p></Card>
      ) : announcements.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无公告</p></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="cursor-pointer" onClick={() => handleOpen(a.id, a.isRead)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: a.isRead ? "var(--muted)" : "var(--accent)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{a.title}</span>
                      {!a.isRead && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--accent)", color: "#fff" }}>新</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {a.users?.name} · {new Date(a.created_at).toLocaleDateString("zh-CN")}
                    </div>
                    {expanded === a.id && (
                      <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--foreground)" }}>{a.content}</p>
                    )}
                  </div>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 18 }}>{expanded === a.id ? "▲" : "▼"}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
