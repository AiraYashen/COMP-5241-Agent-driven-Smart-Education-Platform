"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Sidebar, { NavItem } from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { supabase } from "@/lib/supabase";

const navItems: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "首页",
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/admin/schools",
    label: "学校管理",
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/admin/classes",
    label: "班级管理",
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "用户管理",
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/admin/schedule",
    label: "课表管理",
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

interface AdminShellProps {
  children: React.ReactNode;
  session: any;
}

export default function AdminShell({ children, session }: AdminShellProps) {
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
    "/admin/dashboard": t("nav.dashboard"),
    "/admin/schools": t("nav.schools"),
    "/admin/classes": t("nav.classes"),
    "/admin/users": t("nav.users"),
    "/admin/schedule": t("nav.schedule"),
  };
  const items = navItems.map((n) => ({ ...n, label: navKeys[n.href] ?? n.label }));
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar
        items={items}
        userRole={t("roles.ADMIN")}
        userName={session?.user?.name ?? "Admin"}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={t("admin.title")}
          userName={session?.user?.name ?? "Admin"}
          notificationCount={unreadCount}
          notificationHref="/admin/notifications"
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
