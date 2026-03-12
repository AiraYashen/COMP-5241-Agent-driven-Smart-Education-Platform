"use client";

import { useRouter } from "next/navigation";
import { SCENARIOS } from "@/lib/scenarios";

const difficultyColor: Record<string, string> = {
  初级: "bg-green-100 text-green-700",
  中级: "bg-yellow-100 text-yellow-700",
  高级: "bg-red-100 text-red-700",
};

export default function ScenarioCatalogPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">时空助教 ChronoCo-pilot</h1>
        <p className="text-slate-400 text-lg">穿越历史，亲历那些改变世界的抉择</p>
      </div>

      {/* Scenario Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {SCENARIOS.map((s) => (
          <div
            key={s.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/10 transition"
          >
            {/* Icon + Subject */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg">{s.subjectIcon}</div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-widest">{s.subject}</span>
                <h2 className="text-lg font-semibold text-white leading-tight">{s.title}</h2>
              </div>
            </div>

            {/* Era + Role */}
            <div className="text-sm text-slate-300 space-y-1">
              <p>{s.era}</p>
              <p>扮演角色：{s.role}</p>
              <p>旁白：{s.narratorName}</p>
            </div>

            {/* Description */}
            <p className="text-slate-400 text-sm flex-1">{s.description}</p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${difficultyColor[s.difficulty]}`}>
                {s.difficulty}
              </span>
              <button
                onClick={() => router.push(`/student/scenario/${s.id}`)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition"
              >
                开始模拟 →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
