"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  notificationCount?: number;
  notificationHref?: string;
  userName?: string;
  userAvatar?: string;
}

function switchLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.location.reload();
}

export default function Header({ title, notificationCount = 0, notificationHref, userName, userAvatar }: HeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);

  // read current locale from cookie (client-side)
  const currentLocale =
    typeof document !== "undefined"
      ? (document.cookie.match(/NEXT_LOCALE=([^;]+)/) ?? [])[1] ?? "zh"
      : "zh";

  return (
    <header
      className="flex items-center justify-between px-6 border-b flex-shrink-0 h-[53px]"
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
        color: "var(--foreground)",
      }}
    >
      <h1 className="text-base font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg transition-colors" style={{ }} onMouseEnter={(e)=>(e.currentTarget.style.background="var(--sidebar-hover)")} onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}
          onClick={() => { if (notificationHref) router.push(notificationHref); }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notificationCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold flex items-center justify-center rounded-full text-white"
              style={{ background: "var(--accent)" }}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors" onMouseEnter={(e)=>(e.currentTarget.style.background="var(--sidebar-hover)")} onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>{t("common.language")}</span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-28 rounded-xl border py-1 shadow-2xl z-50 text-sm"
              style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            >
              <button
                onClick={() => { setLangOpen(false); switchLocale("zh"); }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                <span>中文</span>
                {currentLocale === "zh" && <span style={{ color: "var(--accent)" }}>✓</span>}
              </button>
              <button
                onClick={() => { setLangOpen(false); switchLocale("en"); }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                <span>English</span>
                {currentLocale === "en" && <span style={{ color: "var(--accent)" }}>✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        {userName && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: "var(--accent)" }}
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
              ) : (
                userName.charAt(0)
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
