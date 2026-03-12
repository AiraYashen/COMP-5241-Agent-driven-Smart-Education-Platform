"use client";

import { useState, useEffect, useRef } from "react";
import { SegmentData, Concept } from "@/types/lesson";

interface ContentCardProps {
  segment: SegmentData;
  isActive: boolean;
  isPast: boolean;
}

const COLOR_MAP: Record<string, { badge: string; dot: string }> = {
  blue:   { badge: "bg-blue-900/50 border-blue-600/50 text-blue-200",       dot: "bg-blue-400" },
  purple: { badge: "bg-purple-900/50 border-purple-600/50 text-purple-200", dot: "bg-purple-400" },
  green:  { badge: "bg-emerald-900/50 border-emerald-600/50 text-emerald-200", dot: "bg-emerald-400" },
  amber:  { badge: "bg-amber-900/50 border-amber-600/50 text-amber-200",    dot: "bg-amber-400" },
  rose:   { badge: "bg-rose-900/50 border-rose-600/50 text-rose-200",       dot: "bg-rose-400" },
  cyan:   { badge: "bg-cyan-900/50 border-cyan-600/50 text-cyan-200",       dot: "bg-cyan-400" },
};

function ConceptBadge({ concept }: { concept: Concept }) {
  const [open, setOpen] = useState(false);
  const colors = COLOR_MAP[concept.color] ?? COLOR_MAP.blue;
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 ${colors.badge}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {concept.name}
        <span className="text-[10px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-30 w-64 p-3 rounded-xl bg-gray-900 border border-white/10 shadow-2xl text-xs text-gray-200 leading-relaxed animate-fade-in">
          <div className="font-semibold mb-1 text-white">{concept.name}</div>
          {concept.explanation}
          <div className="absolute -bottom-1 left-4 w-2.5 h-2.5 bg-gray-900 border-r border-b border-white/10 rotate-45" />
        </div>
      )}
    </span>
  );
}

export default function ContentCard({ segment, isActive, isPast }: ContentCardProps) {
  const fullText = segment.simplifiedText ?? segment.text;
  const [displayedText, setDisplayedText] = useState(isPast ? fullText : "");
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIndexRef = useRef(isPast ? 9999 : 0);

  useEffect(() => {
    const text = segment.simplifiedText ?? segment.text;
    if (isActive) {
      setDisplayedText("");
      charIndexRef.current = 0;
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      typewriterRef.current = setInterval(() => {
        charIndexRef.current += 2;
        if (charIndexRef.current >= text.length) {
          setDisplayedText(text);
          if (typewriterRef.current) clearInterval(typewriterRef.current);
        } else {
          setDisplayedText(text.slice(0, charIndexRef.current));
        }
      }, 30);
    } else {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      setDisplayedText(text);
    }
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [isActive, segment.text, segment.simplifiedText]);

  return (
    <div
      id={`segment-card-${segment.index}`}
      className={`
        relative rounded-2xl border transition-all duration-500 overflow-visible animate-slide-in-right
        ${isActive
          ? "border-indigo-500/60 bg-indigo-950/30 shadow-xl shadow-indigo-500/10"
          : isPast
          ? "border-white/5 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.03]"}
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-l-2xl" />
      )}

      <div className="p-6 pl-8">
        {/* Header: index + sound wave */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors duration-300 ${isActive ? "bg-indigo-500 text-white" : "bg-white/10 text-gray-500"}`}>
            {segment.index + 1}
          </div>
          {isActive && (
            <div className="flex gap-0.5 items-end h-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 bg-indigo-400 rounded-full animate-sound-wave" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {/* Keywords row */}
          {segment.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {segment.keywords.map((kw, i) => (
                <span key={i} className="px-2.5 py-0.5 text-[11px] rounded-full bg-white/5 border border-white/10 text-gray-400">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Main text with typewriter */}
        <p className={`text-base leading-relaxed mb-4 transition-colors duration-300 ${isActive ? "text-white" : "text-gray-300"}`}>
          {displayedText}
          {isActive && displayedText.length < fullText.length && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-blink align-middle" />
          )}
        </p>

        {/* Concept badges */}
        {segment.concepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {segment.concepts.map((concept, i) => (
              <ConceptBadge key={i} concept={concept} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
