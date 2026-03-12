"use client";

import ReactMarkdown from "react-markdown";
import { ChatRecord, SegmentData } from "@/types/lesson";

/* Markdown 元素样式映射（适配深色背景） */
const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:      ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em:     ({ children }) => <em className="italic text-gray-300">{children}</em>,
  code:   ({ children }) => <code className="px-1.5 py-0.5 rounded bg-white/10 text-gray-200 text-xs font-mono">{children}</code>,
  ul:     ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
  ol:     ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
  li:     ({ children }) => <li className="text-gray-200">{children}</li>,
  h1:     ({ children }) => <h1 className="text-base font-bold text-white mb-1">{children}</h1>,
  h2:     ({ children }) => <h2 className="text-sm font-bold text-white mb-1">{children}</h2>,
  h3:     ({ children }) => <h3 className="text-sm font-semibold text-gray-300 mb-0.5">{children}</h3>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-500/50 pl-3 italic text-gray-400 my-1">{children}</blockquote>,
};

interface TranscriptDrawerProps {
  open: boolean;
  onClose: () => void;
  segments: SegmentData[];
  chatHistory: ChatRecord[];
  title: string | null;
}

export default function TranscriptDrawer({ open, onClose, segments, chatHistory, title }: TranscriptDrawerProps) {
  // Merge segments + chat by time order isn't needed — show segments first, then chat
  const hasChatHistory = chatHistory.length > 0;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-gray-950 border-t border-white/10
          transition-transform duration-500 ease-in-out
          ${open ? "translate-y-0" : "translate-y-full"}
          max-h-[75vh] flex flex-col
        `}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              课程记录
              {title && <span className="text-gray-400 text-sm font-normal">— {title}</span>}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {/* Subtitles */}
          {segments.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">字幕记录</div>
              <div className="space-y-3">
                {segments.map((seg) => (
                  <div key={seg.index} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900/50 border border-indigo-700/40 flex items-center justify-center text-[10px] text-indigo-400 font-bold mt-0.5">
                      {seg.index + 1}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {seg.simplifiedText ?? seg.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat history */}
          {hasChatHistory && (
            <div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">提问记录</div>
              <div className="space-y-3">
                {chatHistory.map((record, i) => (
                  <div key={i}
                    className={`flex gap-3 items-start ${record.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${record.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white/10 text-gray-300"
                      }`}>
                      {record.role === "user" ? "我" : "师"}
                    </div>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${record.role === "user"
                        ? "bg-indigo-600/30 border border-indigo-500/30 text-indigo-100 rounded-tr-sm"
                        : "bg-white/5 border border-white/5 text-gray-200 rounded-tl-sm"
                      }`}>
                      {record.role === "ai"
                        ? <ReactMarkdown components={mdComponents}>{record.content}</ReactMarkdown>
                        : record.content
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {segments.length === 0 && !hasChatHistory && (
            <div className="text-center text-gray-600 py-8 text-sm">暂无记录</div>
          )}
        </div>
      </div>
    </>
  );
}
