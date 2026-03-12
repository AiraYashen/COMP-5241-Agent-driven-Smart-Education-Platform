"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { SCENARIOS } from "@/lib/scenarios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface SessionRow {
  id: string;
  student_id: string;
  scenario_id: string;
  choices_json: { chapter: number; choice: string }[];
  chapter_index: number;
  completed: boolean;
  created_at: string;
}

const COLORS = ["#818cf8", "#34d399", "#f59e0b", "#f87171"];

export default function ScenarioAnalyticsPage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0].id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("scenario_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      setSessions(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = sessions.filter((s) => s.scenario_id === activeScenario);
  const completionRate = filtered.length
    ? Math.round((filtered.filter((s) => s.completed).length / filtered.length) * 100)
    : 0;

  // Build choice distribution per chapter
  const scenario = SCENARIOS.find((s) => s.id === activeScenario)!;
  const chapters = scenario.chaptersHint;
  const choiceData = Array.from({ length: chapters }, (_, i) => {
    const chapterN = i + 1;
    const tally: Record<string, number> = { A: 0, B: 0, C: 0 };
    filtered.forEach((s) => {
      const c = (s.choices_json ?? []).find((ch) => ch.chapter === chapterN);
      if (c?.choice) tally[c.choice] = (tally[c.choice] ?? 0) + 1;
    });
    return { chapter: `第${chapterN}章`, ...tally };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">时空助教 — 情景分析</h1>

      {/* Scenario picker */}
      <div className="flex gap-3 flex-wrap">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenario(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
              activeScenario === s.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {s.subjectIcon} {s.title}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">加载中…</p>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "参与学生数", value: filtered.length },
              { label: "完成率", value: `${completionRate}%` },
              { label: "平均章数", value: filtered.length ? (filtered.reduce((a, s) => a + (s.chapter_index + 1), 0) / filtered.length).toFixed(1) : "—" },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">{m.label}</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Choice distribution chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-4">各章节选择分布</p>
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={choiceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="chapter" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="A" fill={COLORS[0]} name="选项 A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="B" fill={COLORS[1]} name="选项 B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="C" fill={COLORS[2]} name="选项 C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Session list */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <p className="font-semibold text-gray-700 dark:text-gray-200">近期参与明细</p>
            </div>
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">暂无记录</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.slice(0, 20).map((s) => (
                  <div key={s.id} className="px-6 py-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300 font-mono text-xs">{s.student_id.slice(0, 8)}…</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      进度：{s.chapter_index + 1}/{chapters} 章
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.completed
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {s.completed ? "已完成" : "进行中"}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(s.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
