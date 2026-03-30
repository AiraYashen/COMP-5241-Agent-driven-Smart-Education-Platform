"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

interface SidebarProps {
  items: NavItem[];
  userRole: string;
  userName: string;
}

export default function Sidebar({ items, userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : true;

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-[width] duration-300 z-30"
      style={{
        width: collapsed ? 64 : 220,
        background: "var(--sidebar)",
        color: "var(--sidebar-text)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-[53px] flex-shrink-0 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
          style={{ background: "var(--accent)" }}
        >
          E
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-wide truncate">EduPlatform</span>
        )}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="ml-auto p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {(() => {
          const sections: { label: string; isAI: boolean; items: NavItem[] }[] = [];
          for (const item of items) {
            const g = item.group ?? "";
            const last = sections[sections.length - 1];
            if (last && last.label === g) {
              last.items.push(item);
            } else {
              sections.push({ label: g, isAI: g === "智能体", items: [item] });
            }
          }
          return sections.map((section, si) => (
            <div key={si}>
              {si > 0 && (
                <div className="mx-1 my-2 border-t" style={{ borderColor: "var(--sidebar-border)" }} />
              )}
              {section.label && !collapsed && (
                <div className="flex items-center gap-1.5 px-3 mb-1.5">
                  {section.isAI && (
                    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#a78bfa" }}>
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                  )}
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: section.isAI ? "#a78bfa" : "var(--sidebar-text)", opacity: section.isAI ? 0.9 : 0.45 }}
                  >
                    {section.label}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                      style={{
                        background: active ? (section.isAI ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "var(--accent)") : "transparent",
                        color: active ? "#fff" : "var(--sidebar-text)",
                        opacity: active ? 1 : 0.8,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </nav>

      {/* Bottom area: theme + logout */}
      <div className="px-2 pb-4 space-y-1 border-t pt-3" style={{ borderColor: "var(--sidebar-border)" }}>
        {/* User info */}
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="text-xs font-medium truncate">{userName}</div>
            <div className="text-xs opacity-50">{userRole}</div>
          </div>
        )}
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title="切换主题"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left"
          style={{ color: "var(--sidebar-text)", opacity: 0.7 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isDark ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.36l-.7.7M6.34 17.66l-.7.7m12.02 0l-.7-.7M6.34 6.34l-.7-.7M12 7a5 5 0 110 10A5 5 0 0112 7z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
            )}
          </svg>
          {!collapsed && <span>{isDark ? "浅色模式" : "深色模式"}</span>}
        </button>
        {/* Logout */}
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          title="退出登录"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left"
          style={{ color: "var(--sidebar-text)", opacity: 0.7 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.15)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>
    </aside>
  );
}
