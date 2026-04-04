"use client";
import { useTranslations } from "next-intl";
import Sidebar, { NavItem } from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";

const navItems: NavItem[] = [
  // ── 基础功能 ──
  { href: "/student/schedule", label: "我的课表", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { href: "/student/announcements", label: "公告通知", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
  { href: "/student/materials", label: "学习资料", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
  { href: "/student/discussion", label: "讨论区", group: "基础功能", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  // ── 智能体 ──
  { href: "/student/scenario", label: "时空助教", group: "智能体", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { href: "/lesson", label: "口袋课堂", group: "智能体", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  { href: "/student/ai-chat", label: "虚拟导师", group: "智能体", icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
];

export default function StudentShell({ children, session }: { children: React.ReactNode; session: any }) {
  const t = useTranslations();

  const navKeys: Record<string, string> = {
    "/student/schedule": t("nav.schedule"),
    "/student/announcements": t("nav.announcements"),
    "/student/materials": t("nav.materials"),
    "/student/discussion": t("nav.discussion"),
    "/student/ai-chat": "虚拟导师",
    "/student/scenario": t("nav.scenario"),
  };
  const items = navItems.map((n) => ({ ...n, label: navKeys[n.href] ?? n.label }));
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar items={items} userRole={t("roles.STUDENT")} userName={session?.user?.name ?? "Student"} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={t("common.studentCenter")} userName={session?.user?.name ?? "Student"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
