"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Sidebar, { NavItem } from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { supabase } from "@/lib/supabase";

const navItems: NavItem[] = [
  // ── 基础功能 ──
  { href: "/teacher/dashboard",    label: "首页",     group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { href: "/teacher/schedule",     label: "我的课表", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { href: "/teacher/announcements",label: "公告管理", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> },
  { href: "/teacher/materials",    label: "课件管理", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
  { href: "/teacher/discussion",   label: "讨论区",   group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  // ── 智能体 ──
  { href: "/teacher/scenario-themes",    label: "时空助教",     group: "智能体", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { href: "/teacher/ai-ta",              label: "捏个导师",     group: "智能体", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  { href: "/teacher/knowledge-reference",label: "口袋课堂", group: "智能体", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
];

export default function TeacherShell({ children, session }: { children: React.ReactNode; session: any }) {
  const t = useTranslations();
  const userId = (session?.user as any)?.id;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
  }, [userId]);
  const navKeys: Record<string, string> = {
    "/teacher/dashboard": t("nav.dashboard"),
    "/teacher/schedule": t("nav.schedule"),
    "/teacher/announcements": t("nav.announcements"),
    "/teacher/materials": t("nav.materials"),
    "/teacher/discussion": t("nav.discussion"),
    "/teacher/ai-preview": t("nav.aiPreview"),
    "/teacher/scenario-analytics": t("nav.scenarioAnalytics"),
    "/teacher/scenario-themes": "时空助教",
    "/teacher/ai-chat": t("nav.aiChat"),
    "/teacher/ai-ta": "捏个导师",
    "/teacher/knowledge-reference": "口袋课堂",
  };
  const items = navItems.map((n) => ({ ...n, label: navKeys[n.href] ?? n.label }));
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar items={items} userRole={t("roles.TEACHER")} userName={session?.user?.name ?? "Teacher"} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={t("common.teacherWorkbench")} userName={session?.user?.name ?? "Teacher"} notificationCount={unreadCount} notificationHref="/teacher/notifications" />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
