"use client";

import { useEffect, useMemo, useState } from "react";

const DAYS = [1, 2, 3, 4, 5] as const;

const SUBJECT_COLORS: Record<string, string> = {
  语文: "#ef4444", 数学: "#3b82f6", 英语: "#22c55e", 物理: "#a855f7",
  化学: "#f59e0b", 生物: "#06b6d4", 历史: "#f97316", 地理: "#84cc16",
  政治: "#ec4899", 体育: "#14b8a6",
};

const colorFor = (subject: string) => {
  for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
    if (subject.includes(k)) return v;
  }
  const h = [...subject].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${h}, 60%, 55%)`;
};

export interface ScheduleBoardItem {
  id: string;
  weekday: number;
  time_start: string;
  time_end: string;
  subject: string;
  room?: string | null;
  teacherName?: string | null;
  className?: string | null;
  week_type?: "BOTH" | "ODD" | "EVEN" | string | null;
}

interface ScheduleBoardProps {
  title: string;
  subtitle: string;
  items: ScheduleBoardItem[];
  weekDays: string[];
  emptyText: string;
  currentWeek?: number;
}

function weekTypeText(weekType?: string | null) {
  if (!weekType || weekType === "BOTH") return "全周";
  if (weekType === "ODD") return "单周";
  if (weekType === "EVEN") return "双周";
  return weekType;
}

export default function ScheduleBoard({
  title,
  subtitle,
  items,
  weekDays,
  emptyText,
  currentWeek = 1,
}: ScheduleBoardProps) {
  const [selectedWeek, setSelectedWeek] = useState(Math.max(currentWeek, 1));
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("schedule_board_density");
    if (saved === "compact" || saved === "comfortable") {
      setDensity(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("schedule_board_density", density);
  }, [density]);

  const parityLabel = selectedWeek % 2 === 1 ? "单周" : "双周";
  const filtered = useMemo(
    () => items.filter((s) => !s.week_type || s.week_type === "BOTH" || (s.week_type === "ODD" ? selectedWeek % 2 === 1 : selectedWeek % 2 === 0)),
    [items, selectedWeek]
  );

  const grouped = useMemo(() => {
    const result: Record<number, ScheduleBoardItem[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    filtered.forEach((s) => {
      if (result[s.weekday]) result[s.weekday].push(s);
    });
    Object.values(result).forEach((list) => list.sort((a, b) => a.time_start.localeCompare(b.time_start)));
    return result;
  }, [filtered]);

  const todayWeekday = new Date().getDay(); // 0=Sun
  const isCompact = density === "compact";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>{title}</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border px-2 py-2 shadow-sm flex-wrap" style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
          <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
            <button
              type="button"
              className="px-2.5 py-1.5 text-xs transition-colors"
              style={{ background: isCompact ? "var(--background)" : "transparent", color: isCompact ? "var(--foreground)" : "var(--muted)" }}
              onClick={() => setDensity("compact")}
            >
              紧凑
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 text-xs transition-colors"
              style={{ background: !isCompact ? "var(--background)" : "transparent", color: !isCompact ? "var(--foreground)" : "var(--muted)" }}
              onClick={() => setDensity("comfortable")}
            >
              舒展
            </button>
          </div>
          <button
            type="button"
            className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
          >
            上一周
          </button>
          <span className="text-xs" style={{ color: "var(--muted)" }}>第</span>
          <input
            value={selectedWeek}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1) setSelectedWeek(Math.floor(n));
            }}
            className="w-14 text-center text-sm rounded-lg px-1.5 py-1 bg-transparent border focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            style={{ borderColor: "var(--card-border)", color: "var(--foreground)" }}
          />
          <span className="text-xs px-2 py-1 rounded-lg" style={{ color: "var(--muted)", background: "var(--background)" }}>
            {parityLabel}
          </span>
          <button
            type="button"
            className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setSelectedWeek((w) => w + 1)}
          >
            下一周
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 text-xs rounded-lg border hover:bg-white/10 transition-colors"
            style={{ borderColor: "var(--card-border)" }}
            onClick={() => setSelectedWeek(Math.max(currentWeek, 1))}
          >
            当前周
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-5 ${isCompact ? "gap-2.5" : "gap-4"}`}>
        {DAYS.map((d) => (
          <div key={d} className={`rounded-2xl border ${isCompact ? "p-2" : "p-2.5"}`} style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
            <div
              className={`text-center font-semibold rounded-xl mb-2 shadow-sm ${isCompact ? "text-xs py-2" : "text-sm py-2.5"}`}
              style={{
                background: d === todayWeekday ? "var(--accent)" : "var(--background)",
                color: d === todayWeekday ? "#fff" : "var(--foreground)",
              }}
            >
              {weekDays[d - 1] ?? `周${d}`}
            </div>
            <div className={`${isCompact ? "space-y-2 min-h-[140px]" : "space-y-2.5 min-h-[180px]"}`}>
              {grouped[d].length === 0 ? (
                <div
                  className={`text-center rounded-xl ${isCompact ? "text-[11px] py-4" : "text-xs py-6"}`}
                  style={{ background: "var(--background)", color: "var(--muted)", border: "1px dashed var(--card-border)" }}
                >
                  {emptyText}
                </div>
              ) : (
                grouped[d].map((s) => {
                  const color = colorFor(s.subject);
                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl shadow-sm ${isCompact ? "p-2.5" : "p-3"}`}
                      style={{ background: `${color}14`, border: `1px solid ${color}50` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className={`${isCompact ? "text-[11px]" : "text-xs"} font-bold truncate`} style={{ color }}>{s.subject}</div>
                        <span className={`${isCompact ? "text-[9px]" : "text-[10px]"} px-1.5 py-0.5 rounded-md`} style={{ color, background: `${color}22` }}>
                          {weekTypeText(s.week_type)}
                        </span>
                      </div>
                      <div className={`${isCompact ? "text-[11px]" : "text-xs"} mt-1`} style={{ color: "var(--muted)" }}>
                        {s.time_start?.slice(0, 5)}-{s.time_end?.slice(0, 5)}
                      </div>
                      {s.room && <div className={`${isCompact ? "text-[11px]" : "text-xs"} mt-1`} style={{ color: "var(--muted)" }}>教室：{s.room}</div>}
                      {s.teacherName && <div className={`${isCompact ? "text-[11px]" : "text-xs"} mt-1`} style={{ color: "var(--muted)" }}>教师：{s.teacherName}</div>}
                      {s.className && <div className={`${isCompact ? "text-[11px]" : "text-xs"} mt-1`} style={{ color: "var(--muted)" }}>班级：{s.className}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
