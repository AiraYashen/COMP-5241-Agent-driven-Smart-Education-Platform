"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeDef = {
  id: string;
  label: string;
  task: string;
  badgeName: string;
  earned: boolean;
  ctaHref?: string;
  ctaLabel?: string;
};

type Zone = {
  id: string;
  step: number;
  name: string;
  subtitle: string;
  flavor: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  nodes: NodeDef[];
  unlocked: boolean;
};

type ModalPayload = {
  node: NodeDef;
  zoneAccent: string;
  zoneUnlocked: boolean;
};

// ─── SVG icon helpers ─────────────────────────────────────────────────────────

function IconSword() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7M5 5l7 7M5 5h3m-3 0v3" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function IconArrowDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── Per-node icons ───────────────────────────────────────────────────────────

const NODE_ICONS: Record<string, () => JSX.Element> = {
  start: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  quiz: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  work: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  multi: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  excellence: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
    </svg>
  ),
  allround: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  streak: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  diamond: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z" />
    </svg>
  ),
  scenario: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  galaxy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  crown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l3.057 3.516L12 2l3.943 4.516L19 3l2 12H3L5 3z" />
    </svg>
  ),
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function KnowledgeMapPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const router = useRouter();

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const totalNodes = 12;

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const [{ data: grades }, { data: submissions }, { data: wqs }, { data: scenarios }] =
        await Promise.all([
          supabase.from("grades").select("subject, score").eq("student_id", userId),
          supabase.from("submissions").select("id").eq("student_id", userId),
          supabase.from("wrong_questions").select("id").eq("student_id", userId),
          supabase.from("scenario_sessions").select("completed").eq("student_id", userId),
        ]);

      const gradeList = grades ?? [];
      const subList = submissions ?? [];
      const wqList = wqs ?? [];
      const scenList = scenarios ?? [];

      // Subject averages
      const scoreMap: Record<string, number[]> = {};
      gradeList.forEach((g: any) => {
        if (!g.subject) return;
        scoreMap[g.subject] = scoreMap[g.subject] ?? [];
        scoreMap[g.subject].push(Number(g.score));
      });
      const subjectAvgs: Record<string, number> = {};
      Object.entries(scoreMap).forEach(([subj, scores]) => {
        subjectAvgs[subj] = scores.reduce((a, b) => a + b, 0) / scores.length;
      });
      const uniqueSubjects = Object.keys(subjectAvgs).length;
      const subjectsAbove60 = Object.values(subjectAvgs).filter((v) => v >= 60).length;
      const subjectsAbove85 = Object.values(subjectAvgs).filter((v) => v >= 85).length;

      // Derived booleans
      const hasAnyActivity = gradeList.length > 0 || subList.length > 0;
      const hasFirstGrade = gradeList.length > 0;
      const hasThreeSubs = subList.length >= 3;
      const hasTwoSubjects = uniqueSubjects >= 2;
      const hasHighScore = subjectsAbove85 >= 1;
      const hasPrecision = gradeList.length > 0 && wqList.length === 0;
      const hasAllPassing = subjectsAbove60 >= 3;
      const hasConsistency = gradeList.length >= 5;
      const hasTopScore = Object.values(subjectAvgs).some((v) => v >= 90);
      const hasScenario = scenList.some((s: any) => s.completed);
      const hasFiveSubjects = uniqueSubjects >= 5;
      const hasAllExcellence = uniqueSubjects >= 3 && subjectsAbove85 >= 3;

      // Zone 1 nodes
      const z1Nodes: NodeDef[] = [
        {
          id: "start",
          label: "踏上旅途",
          task: "记录任意一次学习行为（成绩录入或作业提交）",
          badgeName: "Hello，学习者",
          earned: hasAnyActivity,
        },
        {
          id: "quiz",
          label: "第一次测验",
          task: "由老师录入至少一次学科成绩",
          badgeName: "答卷初体验",
          earned: hasFirstGrade,
        },
        {
          id: "work",
          label: "勤勉作答",
          task: "累计提交 3 次及以上作业",
          badgeName: "勤勉之星",
          earned: hasThreeSubs,
          ctaHref: "/student/assignments",
          ctaLabel: "前往作业页",
        },
        {
          id: "multi",
          label: "多科探索",
          task: "在两个或以上不同学科中获得成绩记录",
          badgeName: "多科探索者",
          earned: hasTwoSubjects,
        },
      ];

      // Zone 2 nodes
      const z2Nodes: NodeDef[] = [
        {
          id: "excellence",
          label: "优异表现",
          task: "在某一学科的成绩均分达到 85 分或以上",
          badgeName: "优秀学员",
          earned: hasHighScore,
        },
        {
          id: "target",
          label: "精准攻克",
          task: "拥有成绩记录且当前错题记录为零",
          badgeName: "精准射手",
          earned: hasPrecision,
        },
        {
          id: "allround",
          label: "全科达标",
          task: "在 3 个或以上学科的均分达到 60 分",
          badgeName: "全科达人",
          earned: hasAllPassing,
        },
        {
          id: "streak",
          label: "持续精进",
          task: "累计积累 5 条或以上的成绩记录",
          badgeName: "进步达人",
          earned: hasConsistency,
        },
      ];

      // Zone 3 nodes
      const z3Nodes: NodeDef[] = [
        {
          id: "diamond",
          label: "卓越学员",
          task: "在某一学科的成绩均分达到 90 分或以上",
          badgeName: "顶级学霸",
          earned: hasTopScore,
        },
        {
          id: "scenario",
          label: "情景模拟师",
          task: "在「时空助教」中完成至少一个完整的情景模拟",
          badgeName: "时空旅行者",
          earned: hasScenario,
          ctaHref: "/student/scenario",
          ctaLabel: "前往情景模拟",
        },
        {
          id: "galaxy",
          label: "知识博学家",
          task: "在 5 个或以上不同学科中均有成绩记录",
          badgeName: "知识探索者",
          earned: hasFiveSubjects,
        },
        {
          id: "crown",
          label: "全科卓越",
          task: "在 3 个或以上学科中均分达到 85 分",
          badgeName: "全科卓越",
          earned: hasAllExcellence,
        },
      ];

      const z1Lit = z1Nodes.filter((n) => n.earned).length;
      const z2Lit = z2Nodes.filter((n) => n.earned).length;

      const builtZones: Zone[] = [
        {
          id: "z1",
          step: 1,
          name: "新手村",
          subtitle: "学习启程",
          flavor: "每一段旅程都始于第一步。把这里的节点全部点亮，才有资格解锁后面的高级地图。",
          accent: "#10b981",
          gradientFrom: "rgba(16,185,129,0.12)",
          gradientTo: "rgba(16,185,129,0.02)",
          nodes: z1Nodes,
          unlocked: true,
        },
        {
          id: "z2",
          step: 2,
          name: "进阶地图",
          subtitle: "核心武器库",
          flavor: "基础打牢了，这里的任务才会显得顺理成章。巩固每一个知识节点，向更高处迈进。",
          accent: "#f97316",
          gradientFrom: "rgba(249,115,22,0.12)",
          gradientTo: "rgba(249,115,22,0.02)",
          nodes: z2Nodes,
          unlocked: z1Lit >= 2,
        },
        {
          id: "z3",
          step: 3,
          name: "专精殿堂",
          subtitle: "卓越与突破",
          flavor: "没有前两个大区作为前置，直接跳到这里往往会遭遇巨大挫败。扎实的基础才是通往巅峰的阶梯。",
          accent: "#a855f7",
          gradientFrom: "rgba(168,85,247,0.12)",
          gradientTo: "rgba(168,85,247,0.02)",
          nodes: z3Nodes,
          unlocked: z2Lit >= 2,
        },
      ];

      setZones(builtZones);
      setLoading(false);
    };

    load();
  }, [userId]);

  const earnedTotal = zones.reduce((acc, z) => acc + z.nodes.filter((n) => n.earned).length, 0);
  const progressPct = Math.round((earnedTotal / totalNodes) * 100);

  const titleByProgress = () => {
    if (progressPct === 100) return "传奇旅行者";
    if (progressPct >= 75) return "精英探索者";
    if (progressPct >= 50) return "进阶冒险者";
    if (progressPct >= 25) return "初出茅庐";
    return "旅程起点";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-4 animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>学习世界地图</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            点亮节点，解锁成就，探索你的专属学习旅程
          </p>
        </div>

        {/* Global progress bar */}
        <div
          className="rounded-2xl p-5 border"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                总体进度
              </span>
              <span
                className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent)" }}
              >
                {titleByProgress()}
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
              {earnedTotal} / {totalNodes} 节点
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #10b981, #6366f1)",
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            累计解锁 {earnedTotal} 个成就节点，占总路程 {progressPct}%
          </p>
        </div>

        {/* Zone cards */}
        {zones.map((zone, zoneIdx) => {
          const litCount = zone.nodes.filter((n) => n.earned).length;
          const zonePct = Math.round((litCount / zone.nodes.length) * 100);

          return (
            <div key={zone.id}>
              {/* Connector between zones */}
              {zoneIdx > 0 && (
                <div className="flex flex-col items-center py-2 gap-1">
                  <div
                    className="w-px h-6"
                    style={{ background: zone.unlocked ? zone.accent : "var(--card-border)" }}
                  />
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                    style={
                      zone.unlocked
                        ? { background: zone.gradientFrom, borderColor: zone.accent, color: zone.accent }
                        : { background: "var(--card)", borderColor: "var(--card-border)", color: "var(--muted)" }
                    }
                  >
                    {zone.unlocked ? (
                      <>
                        <IconCheck />
                        <span>已解锁 Step {zone.step}</span>
                      </>
                    ) : (
                      <>
                        <IconLock />
                        <span>需在 Step {zone.step - 1} 点亮至少 2 个节点</span>
                      </>
                    )}
                  </div>
                  <div
                    className="w-px h-6"
                    style={{ background: zone.unlocked ? zone.accent : "var(--card-border)" }}
                  />
                  <span style={{ color: "var(--muted)" }}><IconArrowDown /></span>
                </div>
              )}

              {/* Zone card */}
              <div
                className={`rounded-2xl border overflow-hidden transition-opacity ${!zone.unlocked ? "opacity-60" : ""}`}
                style={{ borderColor: zone.unlocked ? zone.accent : "var(--card-border)", background: "var(--card)" }}
              >
                {/* Zone header */}
                <div
                  className="px-5 py-4"
                  style={{
                    background: `linear-gradient(135deg, ${zone.gradientFrom}, ${zone.gradientTo})`,
                    borderBottom: `1px solid ${zone.unlocked ? zone.accent + "33" : "var(--card-border)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: zone.accent + "22", color: zone.accent }}
                      >
                        {zone.step === 1 ? <IconMap /> : zone.step === 2 ? <IconSword /> : <IconBrain />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: zone.accent, color: "#fff" }}
                          >
                            Step {zone.step}
                          </span>
                          <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                            {zone.name}
                          </h3>
                          <span className="text-sm" style={{ color: "var(--muted)" }}>
                            — {zone.subtitle}
                          </span>
                        </div>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                          {zone.flavor}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 gap-1">
                      <span className="text-lg font-bold" style={{ color: zone.accent }}>
                        {litCount} / {zone.nodes.length}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>已点亮</span>
                    </div>
                  </div>

                  {/* Zone progress bar */}
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${zonePct}%`, background: zone.accent }}
                    />
                  </div>
                </div>

                {/* Node grid */}
                <div className="p-4 grid grid-cols-2 gap-3">
                  {zone.nodes.map((node) => {
                    const Icon = NODE_ICONS[node.id] ?? NODE_ICONS.start;
                    const isLocked = !zone.unlocked;

                    return (
                      <button
                        key={node.id}
                        onClick={() => !isLocked && setModal({ node, zoneAccent: zone.accent, zoneUnlocked: zone.unlocked })}
                        disabled={isLocked}
                        className={`relative text-left rounded-xl border p-3 transition-all ${
                          isLocked ? "cursor-default" : "hover:scale-[1.02] cursor-pointer"
                        }`}
                        style={
                          node.earned
                            ? {
                                borderColor: zone.accent,
                                background: zone.accent + "14",
                                boxShadow: `0 0 0 1px ${zone.accent}44, 0 2px 12px ${zone.accent}22`,
                              }
                            : {
                                borderColor: "var(--card-border)",
                                background: "var(--background)",
                              }
                        }
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={
                              node.earned
                                ? { background: zone.accent, color: "#fff" }
                                : { background: "var(--card-border)", color: "var(--muted)" }
                            }
                          >
                            {isLocked ? <IconLock /> : <Icon />}
                          </div>
                          <span
                            className="text-sm font-semibold leading-tight"
                            style={{ color: node.earned ? "var(--foreground)" : "var(--muted)" }}
                          >
                            {node.label}
                          </span>
                        </div>

                        {node.earned ? (
                          <div className="flex items-center gap-1 mt-1">
                            <div
                              className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: zone.accent + "22", color: zone.accent }}
                            >
                              <IconStar />
                              <span>已点亮</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                            {isLocked ? "解锁上一区域后可见" : "点击了解解锁条件"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Badge showcase */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <p className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>成就徽章馆</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {zones.flatMap((zone) =>
              zone.nodes.map((node) => {
                const Icon = NODE_ICONS[node.id] ?? NODE_ICONS.start;
                return (
                  <div
                    key={node.id}
                    title={node.badgeName}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition ${
                      node.earned ? "" : "opacity-35 grayscale"
                    }`}
                    style={
                      node.earned
                        ? { background: zone.accent + "18", border: `1px solid ${zone.accent}44` }
                        : { background: "var(--background)", border: "1px solid var(--card-border)" }
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={
                        node.earned
                          ? { background: zone.accent, color: "#fff" }
                          : { background: "var(--card-border)", color: "var(--muted)" }
                      }
                    >
                      <Icon />
                    </div>
                    <p className="text-xs font-medium leading-tight" style={{ color: "var(--foreground)" }}>
                      {node.badgeName}
                    </p>
                    {node.earned && (
                      <span className="text-xs font-medium" style={{ color: zone.accent }}>
                        已获得
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Node detail modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: modal.node.earned ? modal.zoneAccent : "var(--card-border)",
                    color: modal.node.earned ? "#fff" : "var(--muted)",
                  }}
                >
                  {(() => { const Icon = NODE_ICONS[modal.node.id] ?? NODE_ICONS.start; return <Icon />; })()}
                </div>
                <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                  {modal.node.label}
                </h3>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--muted)" }}
              >
                <IconClose />
              </button>
            </div>

            {modal.node.earned ? (
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: modal.zoneAccent + "18", border: `1px solid ${modal.zoneAccent}44` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-full"
                    style={{ background: modal.zoneAccent, color: "#fff" }}
                  >
                    <IconCheck />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: modal.zoneAccent }}>
                    节点已点亮
                  </span>
                </div>
                <p className="text-sm font-bold mt-2" style={{ color: "var(--foreground)" }}>
                  成就：「{modal.node.badgeName}」
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  恭喜你完成了这个节点的解锁目标！
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                  解锁条件
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                  {modal.node.task}
                </p>
              </div>
            )}

            <div
              className="rounded-xl p-3 mb-4"
              style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--muted)" }}>解锁后可获得成就徽章：</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>
                「{modal.node.badgeName}」
              </p>
            </div>

            <div className="flex gap-2">
              {!modal.node.earned && modal.node.ctaHref && (
                <button
                  onClick={() => { setModal(null); router.push(modal.node.ctaHref!); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: modal.zoneAccent }}
                >
                  {modal.node.ctaLabel}
                </button>
              )}
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
                style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
