"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

/* Markdown 元素样式映射（适配深色背景） */
const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:          ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
  strong:     ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em:         ({ children }) => <em className="italic text-indigo-200">{children}</em>,
  code:       ({ children }) => <code className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-200 text-xs font-mono">{children}</code>,
  ul:         ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
  li:         ({ children }) => <li className="text-indigo-100">{children}</li>,
  h1:         ({ children }) => <h1 className="text-base font-bold text-white mb-1">{children}</h1>,
  h2:         ({ children }) => <h2 className="text-sm font-bold text-white mb-1">{children}</h2>,
  h3:         ({ children }) => <h3 className="text-sm font-semibold text-indigo-200 mb-0.5">{children}</h3>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-400/50 pl-3 italic text-indigo-200 my-1">{children}</blockquote>,
};

interface SubtitleBarProps {
  text: string;
  isVisible: boolean;
  isDone: boolean;
  segmentState: "speaking" | "waiting" | "simplifying" | "idle";
  speechCharIndex: number;   // 已朗读到的字符位置
  onUnderstood: () => void;
  onSkipReading: () => void;
  onSimplify: () => void;
  onOpenTranscript: () => void;
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onChatSubmit: () => void;
  isChatLoading: boolean;
  chatAnswer: string;
  chatSpeechState: "idle" | "speaking" | "paused";
  onToggleChatSpeech: () => void;
  onStopChatSpeech: () => void;
  onClearChatAnswer: () => void;
}

export default function SubtitleBar({
  text, isVisible, isDone,
  segmentState, speechCharIndex,
  onUnderstood, onSkipReading, onSimplify, onOpenTranscript,
  chatInput, onChatInputChange, onChatSubmit, isChatLoading, chatAnswer,
  chatSpeechState, onToggleChatSpeech, onStopChatSpeech, onClearChatAnswer,
}: SubtitleBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(true);
  const [chatAnswerHeight, setChatAnswerHeight] = useState(192); // 默认 max-h-48 = 192px
  const [isDragging, setIsDragging] = useState(false);

  // 新段落开始时自动折叠
  useEffect(() => { setExpanded(false); }, [text]);
  useEffect(() => { if (chatAnswer) setChatExpanded(true); }, [chatAnswer]);

  // 从 localStorage 恢复高度偏好
  useEffect(() => {
    const saved = localStorage.getItem("chat_answer_height");
    if (saved) {
      const height = Math.max(100, Math.min(400, parseInt(saved, 10))); // 限制在 100-400px
      setChatAnswerHeight(height);
    }
  }, []);

  // 处理拖动调整高度
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.movementY;
      setChatAnswerHeight((prev) => {
        const newHeight = Math.max(100, Math.min(400, prev - delta));
        localStorage.setItem("chat_answer_height", String(newHeight));
        return newHeight;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  if (!isVisible && !isDone) return null;

  const isSpeaking = segmentState === "speaking";

  // 已朗读 / 未朗读 分割
  const spoken   = isSpeaking ? text.slice(0, speechCharIndex) : text;
  const unspoken = isSpeaking ? text.slice(speechCharIndex) : "";

  // 紧凑行：只显示最近 30 字已读 + 光标 + 未读前 50 字
  const BEFORE = 30;
  const AFTER  = 50;
  const spokenLine   = spoken.length > BEFORE ? "…" + spoken.slice(-BEFORE) : spoken;
  const unspokenLine = unspoken.length > AFTER ? unspoken.slice(0, AFTER) + "…" : unspoken;

  const emptyHint = isDone ? "课程讲解完毕" : "正在准备...";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      {/* 底部渐变遮罩（缩小高度，减少遮挡） */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-5 pb-3 pt-1 space-y-2">

        {/* ── 展开面板：完整字幕 ─────────────────────────── */}
        {expanded && text && (
          <div className="px-4 py-3 bg-gray-900/80 border border-white/[0.08] rounded-xl text-sm leading-relaxed animate-fade-in max-h-36 overflow-y-auto">
            <span className="text-white/90">{spoken}</span>
            {isSpeaking && (
              <span className="inline-block w-px h-4 bg-white mx-px animate-blink align-middle" />
            )}
            <span className="text-gray-500">{unspoken}</span>
          </div>
        )}

        {/* ── AI 追问回答 ─────────────────────────────────── */}
        {chatAnswer && (
          <div className="flex gap-2 items-start animate-fade-in group">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">师</div>
            <div className="flex-1 bg-indigo-950/60 border border-indigo-700/30 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-indigo-100 leading-relaxed flex flex-col" style={{ maxHeight: `${chatAnswerHeight}px` }}>
              <div className="flex items-center justify-between gap-2 mb-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setChatExpanded((v) => !v)}
                  className="text-[11px] text-indigo-200/90 hover:text-white transition-colors"
                >
                  {chatExpanded ? "收起回答" : "展开回答"}
                </button>
                <div className="flex items-center gap-2">
                  {chatSpeechState !== "idle" && (
                    <button
                      type="button"
                      onClick={onToggleChatSpeech}
                      className="text-[11px] text-indigo-200/90 hover:text-white transition-colors"
                    >
                      {chatSpeechState === "paused" ? "继续朗读" : "暂停朗读"}
                    </button>
                  )}
                  {chatSpeechState !== "idle" && (
                    <button
                      type="button"
                      onClick={onStopChatSpeech}
                      className="text-[11px] text-indigo-200/90 hover:text-white transition-colors"
                    >
                      停止朗读
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClearChatAnswer}
                    className="text-[11px] text-indigo-200/90 hover:text-white transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
              {chatExpanded && (
                <div className="flex-1 overflow-y-auto pr-2">
                  <ReactMarkdown components={mdComponents}>{chatAnswer}</ReactMarkdown>
                  {isChatLoading && (
                    <span className="inline-block w-0.5 h-3.5 bg-indigo-400 ml-0.5 animate-blink align-middle" />
                  )}
                </div>
              )}
            </div>
            {/* 高度调整手柄 */}
            <div
              onMouseDown={handleMouseDown}
              className={`flex-shrink-0 w-1 bg-indigo-700/30 rounded-full hover:bg-indigo-600/50 transition-all cursor-ns-resize ${isDragging ? "bg-indigo-500" : ""}`}
              title="拖动调整回答框高度"
            />
          </div>
        )}

        {/* ── 紧凑字幕行（可点击展开完整字幕） ─────────────── */}
        <div
          role="button"
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={() => text && setExpanded((e) => !e)}
        >
          {/* 状态图标 */}
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {isSpeaking ? (
              <span className="flex gap-0.5 items-end h-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full bg-indigo-400 animate-sound-wave"
                    style={{ animationDelay: `${i * 0.15}s`, minHeight: "3px" }}
                  />
                ))}
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            )}
          </div>

          {/* 字幕文字（逐字跟随朗读） */}
          <div className="flex-1 min-w-0 text-sm leading-5">
            {!text ? (
              <span className="text-gray-500">{emptyHint}</span>
            ) : (
              <span className="block truncate">
                <span className="text-white font-medium">{spokenLine}</span>
                {isSpeaking && (
                  <span className="inline-block w-px h-3.5 bg-white/80 mx-px animate-blink align-text-bottom" />
                )}
                <span className="text-gray-500">{unspokenLine}</span>
              </span>
            )}
          </div>

          {/* 折叠 / 展开箭头 */}
          {text && (
            <svg
              className={`flex-shrink-0 w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-transform duration-200 ${expanded ? "" : "rotate-180"}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}

          {/* 记录按钮 */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenTranscript(); }}
            className="flex-shrink-0 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.08] text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            {isDone ? "查看全部" : "记录"}
          </button>
        </div>

        {/* ── 理解 / 没懂 按钮 ─────────────────────────────── */}
        {segmentState === "speaking" && (
          <div className="flex items-center gap-2 animate-fade-in pl-7">
            <button
              onClick={onSkipReading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M4 5l7 7-7 7" />
              </svg>
              跳过朗读
            </button>
          </div>
        )}
        {segmentState === "waiting" && (
          <div className="flex items-center gap-2 animate-fade-in pl-7">
            <button
              onClick={onUnderstood}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              理解了，继续
            </button>
            <button
              onClick={onSimplify}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              没懂，换种方式讲
            </button>
          </div>
        )}
        {segmentState === "simplifying" && (
          <div className="flex items-center gap-2 pl-7 text-amber-400 text-xs animate-fade-in">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            AI 老师正在换个说法...
          </div>
        )}

        {/* ── 输入框 ──────────────────────────────────────── */}
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onChatSubmit(); } }}
            placeholder="有疑问？随时打断提问..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
          />
          <button
            onClick={onChatSubmit}
            disabled={!chatInput.trim() || isChatLoading}
            className="flex-shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
          >
            {isChatLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


