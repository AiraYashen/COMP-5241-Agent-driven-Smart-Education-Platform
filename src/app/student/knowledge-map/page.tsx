"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface SubjectStat {
  subject: string;
  score: number;
  fullMark: 100;
}

interface Badge {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
  desc: string;
}

export default function KnowledgeMapPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [radarData, setRadarData] = useState<SubjectStat[]>([]);
  const [weakPoints, setWeakPoints] = useState<string[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [mindmapHtml, setMindmapHtml] = useState<string | null>(null);
  const [mindmapLoading, setMindmapLoading] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: grades }, { data: wqs }] = await Promise.all([
        supabase.from("grades").select("subject, score").eq("student_id", userId),
        supabase.from("wrong_questions").select("knowledge_point, subject").eq("student_id", userId),
      ]);

      // Build radar data
      const scoreMap: Record<string, number[]> = {};
      (grades ?? []).forEach((g: any) => {
        if (!g.subject) return;
        if (!scoreMap[g.subject]) scoreMap[g.subject] = [];
        scoreMap[g.subject].push(Number(g.score));
      });
      const radar = Object.entries(scoreMap).map(([subject, scores]) => ({
        subject,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        fullMark: 100 as const,
      }));
      setRadarData(radar);

      // Weak points from wrong questions
      const kpMap: Record<string, number> = {};
      (wqs ?? []).forEach((w: any) => {
        if (w.knowledge_point) kpMap[w.knowledge_point] = (kpMap[w.knowledge_point] ?? 0) + 1;
      });
      const sorted = Object.entries(kpMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([kp]) => kp);
      setWeakPoints(sorted);

      // Build badges
      const newBadges: Badge[] = [
        { id: "first_lesson", label: "开课第一步", emoji: "", earned: (grades?.length ?? 0) > 0, desc: "完成第一次测验" },
        { id: "high_score", label: "优秀学员", emoji: "", earned: radar.some((r) => r.score >= 85), desc: "某科目均分 ≥ 85" },
        { id: "all_round", label: "全科达人", emoji: "", earned: radar.length >= 3 && radar.every((r) => r.score >= 60), desc: "三科以上全部通过" },
        { id: "no_weak", label: "错题清零", emoji: "", earned: (wqs?.length ?? 0) === 0, desc: "没有待攻克的知识点" },
        { id: "explorer", label: "知识探索者", emoji: "", earned: radar.length >= 5, desc: "学习 5 门以上科目" },
        { id: "scenario", label: "时空旅行者", emoji: "", earned: false, desc: "完成一次情景模拟" },
      ];
      setBadges(newBadges);
      setLoading(false);
    };
    load();
  }, [userId]);

  const generateMindmap = async () => {
    if (!radarData.length) return;
    setMindmapLoading(true);
    const subjects = radarData.map((r) => `${r.subject}（掌握度${r.score}%）`).join("、");
    const weak = weakPoints.join("、") || "暂无";
    const res = await fetch("/api/teacher/generate-mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: `我的知识图谱（学科：${subjects}，薄弱点：${weak}）`,
        hints: "以 mindmap 展示各学科关键知识点和薄弱项，用中文",
      }),
    });
    const data = await res.json();
    if (data.mermaidCode && mermaidRef.current) {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "base" });
        const id = `km_${Date.now()}`;
        const { svg } = await mermaid.render(id, data.mermaidCode);
        setMindmapHtml(svg);
      } catch {
        // ignore render errors
      }
    }
    setMindmapLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>我的知识地图</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>可视化你的学习历程与掌握进度</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="rounded-2xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <p className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>学科掌握雷达图</p>
          {radarData.length < 3 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
              成绩数据不足（需至少 3 个学科），继续学习解锁更多！
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weak points */}
        <div className="rounded-2xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <p className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>待攻克知识点</p>
          {weakPoints.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: "var(--muted)" }}>暂无错题记录，继续保持！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakPoints.map((kp, i) => (
                <div key={kp} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{kp}</p>
                  </div>
                  <button
                    onClick={() => window.open(`/lesson?q=${encodeURIComponent(kp)}`, "_blank")}
                    className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded"
                  >
                    去学习
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <p className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>学习勋章</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {badges.map((b) => (
              <div
              key={b.id}
              title={b.desc}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition ${
                b.earned
                  ? "bg-indigo-50 dark:bg-indigo-900/30"
                  : "opacity-40 grayscale"
              }`}
            >
              {b.emoji && <span className="text-3xl">{b.emoji}</span>}
              <p className="text-xs font-medium leading-tight" style={{ color: "var(--foreground)" }}>{b.label}</p>
              {b.earned && <span className="text-xs text-green-500">已获得</span>}
            </div>
          ))}
        </div>
      </div>

      {/* AI Mindmap */}
      <div className="rounded-2xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold" style={{ color: "var(--foreground)" }}>AI 知识脑图</p>
          <button
            onClick={generateMindmap}
            disabled={mindmapLoading || radarData.length === 0}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition"
          >
            {mindmapLoading ? "生成中…" : "生成脑图"}
          </button>
        </div>
        {mindmapHtml ? (
          <div
            ref={mermaidRef}
            className="overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: mindmapHtml }}
          />
        ) : (
          <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
            点击「生成脑图」，AI 将根据你的学习记录绘制专属知识地图
          </p>
        )}
      </div>
    </div>
  );
}
