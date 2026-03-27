"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import TitleCard from "@/components/TitleCard";
import VisualPanel from "@/components/VisualPanel";
import SubtitleBar from "@/components/SubtitleBar";
import TranscriptDrawer from "@/components/TranscriptDrawer";
import LoadingOverlay from "@/components/LoadingOverlay";
import { SegmentData, ChatRecord } from "@/types/lesson";
import { readLessonCache, writeLessonCache } from "@/lib/lessonCache";

export type { SegmentData };

interface LessonPlayerProps {
  question: string;
  sid?: string;
}

type SegmentState = "pending" | "speaking" | "waiting" | "understood" | "simplifying";

interface LessonPlayerCache {
  title: string | null;
  segments: SegmentData[];
  shownSegments: SegmentData[];
  segmentStates: Record<number, SegmentState>;
  totalSegments: number;
  currentIndex: number;
  isDone: boolean;
  chatHistory: ChatRecord[];
}

export default function LessonPlayer({ question, sid }: LessonPlayerProps) {
  const [title, setTitle] = useState<string | null>(null);
  const allSegmentsRef = useRef<SegmentData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [segmentStates, setSegmentStates] = useState<Record<number, SegmentState>>({});
  const [loadingMessage, setLoadingMessage] = useState("备课中...");
  const [isLoading, setIsLoading] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [totalSegments, setTotalSegments] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // 已出现的段落（用于时间线渲染）
  const [shownSegments, setShownSegments] = useState<SegmentData[]>([]);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSpeechState, setChatSpeechState] = useState<"idle" | "speaking" | "paused">("idle");
  const chatAnswerRef = useRef("");
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([]);

  const speechQueueRef = useRef<SegmentData[]>([]);
  const isSpeakingRef = useRef(false);
  const waitingForUserRef = useRef(false);
  const skipCurrentSegmentRef = useRef(false);
  const restoredFromCacheRef = useRef(false);
  const cacheHydratedRef = useRef(false);
  const simplifyAttemptRef = useRef(0); // 记录当前段"没懂"次数

  // 移动端语音解锁
  const speechUnlockedRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [needsUserTap, setNeedsUserTap] = useState(false);

  // 语音播放进度 0-1（由 onboundary 更新，用于精确同步 VisualPanel）
  const [speechProgress, setSpeechProgress] = useState(0);
  // 已朗读字符数（用于字幕逐字显示）
  const [subtitleCharIndex, setSubtitleCharIndex] = useState(0);

  // 用于自动滚动到当前段落
  const segmentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lessonCacheKey = useMemo(
    () => `lesson_player_cache:${sid?.trim() ? `sid:${sid}` : `q:${question}`}`,
    [question, sid]
  );
  const chatHistoryCacheKey = useMemo(
    () => `lesson_chat_history:${sid?.trim() ? `sid:${sid}` : `q:${question}`}`,
    [question, sid]
  );

  const titleRef = useRef<string | null>(title);
  const shownSegmentsRef = useRef<SegmentData[]>(shownSegments);
  const segmentStatesRef = useRef<Record<number, SegmentState>>(segmentStates);
  const totalSegmentsRef = useRef(totalSegments);
  const currentIndexRef = useRef(currentIndex);
  const isDoneRef = useRef(isDone);
  const chatHistoryRef = useRef<ChatRecord[]>(chatHistory);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { shownSegmentsRef.current = shownSegments; }, [shownSegments]);
  useEffect(() => { segmentStatesRef.current = segmentStates; }, [segmentStates]);
  useEffect(() => { totalSegmentsRef.current = totalSegments; }, [totalSegments]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { isDoneRef.current = isDone; }, [isDone]);
  useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);

  const persistLessonCache = useCallback((overrides?: Partial<LessonPlayerCache> & { segments?: SegmentData[] }) => {
    if (!cacheHydratedRef.current) return;
    writeLessonCache(lessonCacheKey, {
      title: overrides?.title ?? titleRef.current,
      segments: overrides?.segments ?? allSegmentsRef.current,
      shownSegments: overrides?.shownSegments ?? shownSegmentsRef.current,
      segmentStates: overrides?.segmentStates ?? segmentStatesRef.current,
      totalSegments: overrides?.totalSegments ?? totalSegmentsRef.current,
      currentIndex: overrides?.currentIndex ?? currentIndexRef.current,
      isDone: overrides?.isDone ?? isDoneRef.current,
      chatHistory: overrides?.chatHistory ?? chatHistoryRef.current,
    });
  }, [lessonCacheKey]);

  const persistChatHistory = useCallback((nextHistory: ChatRecord[]) => {
    if (!cacheHydratedRef.current) return;
    writeLessonCache(chatHistoryCacheKey, nextHistory);
  }, [chatHistoryCacheKey]);

  const setSegState = useCallback((idx: number, state: SegmentState) => {
    setSegmentStates((prev) => {
      const next = { ...prev, [idx]: state };
      persistLessonCache({ segmentStates: next });
      return next;
    });
  }, [persistLessonCache]);

  // 异步加载可用语音（移动端 getVoices() 在 voiceschanged 前返回空数组）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // 非 iOS 设备无需手势解锁，直接标记为已解锁
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) speechUnlockedRef.current = true;
  }, []);

  // 刷新/离开页面时自动暂停朗读，避免语音跨页面继续播放
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pauseSpeechOnLeave = () => {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
        }
      } catch {
        // ignore browser speech API errors
      }
    };

    window.addEventListener("beforeunload", pauseSpeechOnLeave);
    window.addEventListener("pagehide", pauseSpeechOnLeave);
    return () => {
      window.removeEventListener("beforeunload", pauseSpeechOnLeave);
      window.removeEventListener("pagehide", pauseSpeechOnLeave);
    };
  }, []);

  const getChineseVoice = (): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "zh-CN" && v.name.includes("Yaoyao")) ||
      voices.find((v) => v.lang === "zh-CN" && v.name.includes("Xiaoyi")) ||
      voices.find((v) => v.lang === "zh-CN" && v.name.includes("Yunxi")) ||
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => v.lang.startsWith("zh")) ||
      null
    );
  };

  const speakText = useCallback((text: string, onEnd: () => void, onBoundary?: (charIdx: number, textLen: number) => void) => {
    // 清除上次 watchdog
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    const voice = getChineseVoice();
    if (voice) utterance.voice = voice;
    if (onBoundary) {
      utterance.onboundary = (e) => onBoundary(e.charIndex, text.length);
    }
    let ended = false;
    const safeOnEnd = () => {
      if (ended) return;
      ended = true;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      onEnd();
    };
    utterance.onend = safeOnEnd;
    utterance.onerror = safeOnEnd;
    window.speechSynthesis.speak(utterance);
    // Watchdog：按中文约 4 字/秒估算，2 倍超时兜底，最少 20 秒
    const estimatedMs = Math.max(20000, (text.length / 4) * 1000 * 2);
    watchdogTimerRef.current = setTimeout(() => {
      if (!ended) {
        window.speechSynthesis.cancel();
        safeOnEnd();
      }
    }, estimatedMs);
  }, []);

  const playSegment = useCallback((seg: SegmentData) => {
    skipCurrentSegmentRef.current = false;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setCurrentIndex(seg.index);
    setSegState(seg.index, "speaking");
    setSpeechProgress(0);
    setSubtitleCharIndex(0);
    simplifyAttemptRef.current = 0;

    // 加入时间线（如果还没有）
    setShownSegments((prev) => {
      if (prev.find((s) => s.index === seg.index)) return prev;
      const next = [...prev, seg];
      persistLessonCache({ shownSegments: next, currentIndex: seg.index });
      return next;
    });

    // 滚动到当前段（稍延迟等 DOM 渲染）
    setTimeout(() => {
      const el = segmentRefs.current[seg.index];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);

    const textToSpeak = seg.simplifiedText ?? seg.text;
    speakText(
      textToSpeak,
      () => {
        if (skipCurrentSegmentRef.current) {
          skipCurrentSegmentRef.current = false;
          return;
        }
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setSpeechProgress(1);
        setSubtitleCharIndex(textToSpeak.length);
        waitingForUserRef.current = true;
        setSegState(seg.index, "waiting");
      },
      (charIdx, textLen) => {
        setSpeechProgress(Math.min(charIdx / Math.max(textLen, 1), 1));
        setSubtitleCharIndex(charIdx);
      }
    );
  }, [speakText, setSegState]);

  const enqueueSegment = useCallback((seg: SegmentData) => {
    speechQueueRef.current.push(seg);
    if (!speechUnlockedRef.current) {
      // iOS 需要用户手势才能播放，先缓冲并显示提示
      setNeedsUserTap(true);
      return;
    }
    if (!isSpeakingRef.current && !waitingForUserRef.current) {
      const next = speechQueueRef.current.shift();
      if (next) playSegment(next);
    }
  }, [playSegment]);

  // iOS 解锁：播放静音 utterance 以激活 speech API，然后继续队列
  const unlockSpeech = useCallback(() => {
    setNeedsUserTap(false);
    if (speechUnlockedRef.current) {
      if (!isSpeakingRef.current && !waitingForUserRef.current) {
        const next = speechQueueRef.current.shift();
        if (next) playSegment(next);
      }
      return;
    }
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0;
    silent.lang = "zh-CN";
    const afterUnlock = () => {
      speechUnlockedRef.current = true;
      if (!isSpeakingRef.current && !waitingForUserRef.current) {
        const next = speechQueueRef.current.shift();
        if (next) playSegment(next);
      }
    };
    silent.onend = afterUnlock;
    silent.onerror = afterUnlock;
    window.speechSynthesis.speak(silent);
  }, [playSegment]);

  const handleUnderstood = useCallback(() => {
    if (currentIndex < 0) return;
    setSegState(currentIndex, "understood");
    waitingForUserRef.current = false;
    const next = speechQueueRef.current.shift();
    if (next) playSegment(next);
  }, [currentIndex, playSegment, setSegState]);

  const handleSkipReading = useCallback(() => {
    if (currentIndex < 0) {
      return;
    }

    const currentSeg = allSegmentsRef.current.find((s) => s.index === currentIndex);
    const currentText = currentSeg ? (currentSeg.simplifiedText ?? currentSeg.text) : "";

    skipCurrentSegmentRef.current = true;
    waitingForUserRef.current = false;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setSpeechProgress(1);
    setSubtitleCharIndex(currentText.length);
    setSegState(currentIndex, "waiting");
    window.speechSynthesis.cancel();
  }, [currentIndex, playSegment, setSegState]);

  const handleReplayLesson = useCallback(() => {
    const segments = allSegmentsRef.current;
    if (segments.length === 0) return;

    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    waitingForUserRef.current = false;
    isSpeakingRef.current = false;
    skipCurrentSegmentRef.current = false;

    setIsSpeaking(false);
    setSpeechProgress(0);
    setSubtitleCharIndex(0);
    setCurrentIndex(-1);
    setShownSegments([]);
    setSegmentStates({});
    persistLessonCache({ currentIndex: -1, shownSegments: [], segmentStates: {} });

    const [first, ...rest] = segments;
    if (!first) return;
    speechQueueRef.current = rest;
    playSegment(first);
  }, [playSegment]);

  const handleSimplify = useCallback(async () => {
    if (currentIndex < 0) return;
    const idx = currentIndex;
    simplifyAttemptRef.current += 1;
    const attempt = simplifyAttemptRef.current;

    setSegState(idx, "simplifying");
    waitingForUserRef.current = false;
    window.speechSynthesis.cancel();

    try {
      const seg = allSegmentsRef.current.find((s) => s.index === idx);
      if (!seg) return;

      const res = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: seg.text, question, attemptNumber: attempt }),
      });
      const data = await res.json() as {
        text?: string; keywords?: string[]; concepts?: Array<{ name: string; explanation: string; color: string }>;
        visualItems?: unknown[];
      };

      if (data.text) {
        // 生成新的补充段，追加到时间线
        const newIndex = allSegmentsRef.current.length;
        const newSeg: SegmentData = {
          index: newIndex,
          text: data.text,
          keywords: data.keywords ?? [],
          concepts: data.concepts ?? [],
          visualItems: (data.visualItems as SegmentData["visualItems"]) ?? [],
        };
        allSegmentsRef.current.push(newSeg);
        setTotalSegments((prev) => prev + 1);
        // 直接播放补充段（队列中的预计划段不动，补充段讲完后继续）
        playSegment(newSeg);
      } else {
        // fallback：直接重播当前段
        playSegment(seg);
      }
    } catch {
      const seg = allSegmentsRef.current.find((s) => s.index === idx);
      if (seg) playSegment(seg);
    }
  }, [currentIndex, question, playSegment, setSegState]);

  const handleChat = useCallback(async () => {
    const userQ = chatInput.trim();
    if (!userQ || isChatLoading) return;
    setChatInput("");
    setIsChatLoading(true);
    setChatAnswer("");
    chatAnswerRef.current = "";

    setChatHistory((prev) => {
      const record: ChatRecord = { role: "user", content: userQ, timestamp: Date.now() };
      const next = [...prev, record];
      persistChatHistory(next);
      persistLessonCache({ chatHistory: next });
      return next;
    });
    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
      window.speechSynthesis.cancel();
    }

    const context = `课题：${question}，当前讲到：${allSegmentsRef.current.find((s) => s.index === currentIndex)?.text ?? ""}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuestion: userQ, context }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chatAnswerRef.current += decoder.decode(value);
        setChatAnswer(chatAnswerRef.current);
      }
      setChatHistory((prev) => {
        const record: ChatRecord = { role: "ai", content: chatAnswerRef.current, timestamp: Date.now() };
        const next = [...prev, record];
        persistChatHistory(next);
        persistLessonCache({ chatHistory: next });
        return next;
      });
      setChatSpeechState("speaking");
      speakText(chatAnswerRef.current, () => setChatSpeechState("idle"));
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, question, currentIndex, speakText, persistChatHistory, persistLessonCache]);

  const handleToggleChatSpeech = useCallback(() => {
    if (!chatAnswer.trim()) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setChatSpeechState("speaking");
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setChatSpeechState("paused");
    }
  }, [chatAnswer]);

  const handleStopChatSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setChatSpeechState("idle");
  }, []);

  const handleClearChatAnswer = useCallback(() => {
    window.speechSynthesis.cancel();
    setChatSpeechState("idle");
    setChatAnswer("");
    chatAnswerRef.current = "";
  }, []);

  // 尝试从缓存恢复已生成课程，避免模式切换或历史回看时重复生成
  useEffect(() => {
    if (typeof window === "undefined") return;
    restoredFromCacheRef.current = false;
    cacheHydratedRef.current = false;

    try {
      const cache = readLessonCache<LessonPlayerCache>(lessonCacheKey);
      const chatOnlyCache = readLessonCache<ChatRecord[]>(chatHistoryCacheKey);
      if (!cache) {
        if (Array.isArray(chatOnlyCache)) setChatHistory(chatOnlyCache);
        cacheHydratedRef.current = true;
        return;
      }
      if (!Array.isArray(cache.segments) || cache.segments.length === 0) {
        if (Array.isArray(chatOnlyCache)) setChatHistory(chatOnlyCache);
        cacheHydratedRef.current = true;
        return;
      }

      allSegmentsRef.current = cache.segments;
      speechQueueRef.current = [];
      waitingForUserRef.current = false;
      isSpeakingRef.current = false;

      setTitle(cache.title ?? null);
      setShownSegments(cache.shownSegments?.length ? cache.shownSegments : cache.segments);
      setSegmentStates(
        cache.segmentStates && Object.keys(cache.segmentStates).length > 0
          ? cache.segmentStates
          : Object.fromEntries(cache.segments.map((seg) => [seg.index, "understood" as const]))
      );
      setTotalSegments(cache.totalSegments ?? cache.segments.length);
      setCurrentIndex(
        typeof cache.currentIndex === "number"
          ? cache.currentIndex
          : (cache.shownSegments?.[cache.shownSegments.length - 1]?.index
            ?? cache.segments[cache.segments.length - 1]?.index
            ?? -1)
      );
      setIsDone(cache.isDone ?? true);
      setChatHistory(
        Array.isArray(chatOnlyCache)
          ? chatOnlyCache
          : Array.isArray(cache.chatHistory)
          ? cache.chatHistory
          : []
      );
      setIsLoading(false);
      setError(null);
      setIsSpeaking(false);
      setSpeechProgress(0);
      setSubtitleCharIndex(0);
      restoredFromCacheRef.current = true;
    } catch {
      // ignore invalid cache
    } finally {
      cacheHydratedRef.current = true;
    }
  }, [lessonCacheKey, chatHistoryCacheKey]);

  // 持久化当前课程状态，供切换模式和历史回看恢复
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!cacheHydratedRef.current) return;
    if (!title && allSegmentsRef.current.length === 0) return;

    const cache: LessonPlayerCache = {
      title,
      segments: allSegmentsRef.current,
      shownSegments,
      segmentStates,
      totalSegments,
      currentIndex,
      isDone,
      chatHistory,
    };

    writeLessonCache(lessonCacheKey, cache);
  }, [
    lessonCacheKey,
    title,
    shownSegments,
    segmentStates,
    totalSegments,
    currentIndex,
    isDone,
    chatHistory,
  ]);

  // SSE
  useEffect(() => {
    if (!question && !sid) { setError("请输入问题"); setIsLoading(false); return; }
    if (restoredFromCacheRef.current) return;
    window.speechSynthesis.cancel();
    const apiUrl = sid
      ? `/api/lesson?sid=${encodeURIComponent(sid)}`
      : `/api/lesson?q=${encodeURIComponent(question)}`;
    const es = new EventSource(apiUrl);
    es.addEventListener("loading", (e) => { setLoadingMessage(JSON.parse(e.data).message); });
    es.addEventListener("title", (e) => { setTitle(JSON.parse(e.data).title); setIsLoading(false); });
    es.addEventListener("segment", (e) => {
      const seg: SegmentData = JSON.parse(e.data);
      allSegmentsRef.current.push(seg);
      setTotalSegments((prev) => {
        const next = prev + 1;
        persistLessonCache({ totalSegments: next, segments: allSegmentsRef.current });
        return next;
      });
      setTimeout(() => enqueueSegment(seg), 80);
    });
    es.addEventListener("done", () => {
      setIsDone(true);
      persistLessonCache({ isDone: true });
      es.close();
    });
    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setError(data.message ?? "未知错误");
      } catch {
        if ((e.target as EventSource).readyState !== EventSource.CLOSED) {
          setError("连接中断，请刷新重试");
        }
      }
      setIsLoading(false);
      es.close();
    });
    return () => { es.close(); window.speechSynthesis.cancel(); };
  }, [question, sid, enqueueSegment]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-xl">{error}</div>
        <a href="/" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">返回首页</a>
      </div>
    );
  }

  const fallbackSeg = shownSegments.length > 0 ? shownSegments[shownSegments.length - 1] : undefined;
  const currentSeg = allSegmentsRef.current.find((s) => s.index === currentIndex) ?? fallbackSeg;
  const currentState: SegmentState =
    currentSeg
      ? (segmentStates[currentSeg.index] ?? "pending")
      : "idle" as SegmentState;
  const subtitleText = currentSeg ? (currentSeg.simplifiedText ?? currentSeg.text) : "";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur border-b border-white/5 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <a href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </a>
        <div className="text-gray-400 text-sm truncate max-w-sm font-medium">{question}</div>
        <div className="flex items-center gap-3 text-xs">
          {isSpeaking && (
            <span className="flex items-center gap-1.5 text-indigo-400 text-xs">
              <span className="inline-flex gap-0.5 items-end h-3.5">
                {[0,1,2].map((i) => (
                  <span key={i} className="w-0.5 bg-indigo-400 rounded-full animate-sound-wave" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </span>
              朗读中
            </span>
          )}
          {!isLoading && isSpeaking && (
            <button
              onClick={() => {
                if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); setIsSpeaking(true); }
                else if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); setIsSpeaking(false); }
              }}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors text-xs"
            >
              暂停
            </button>
          )}
          {!isLoading && allSegmentsRef.current.length > 0 && (
            <button
              onClick={handleReplayLesson}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors text-xs"
            >
              重新朗读
            </button>
          )}
          <span className="text-gray-600">
            {isDone ? `共 ${totalSegments} 节` : totalSegments > 0 ? `${totalSegments} 节...` : ""}
          </span>
        </div>
      </nav>

      {/* 时间线内容区域 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-[210px]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {title && <TitleCard title={title} />}

          {/* 时间线：所有已出现的段落 */}
          <div className="mt-10">
            <div className="space-y-6">
              {shownSegments.map((seg, segIdx) => {
                const state = segmentStates[seg.index] ?? "pending";
                const isActive = seg.index === currentIndex && state === "speaking";
                const isPast = state === "understood";
                const isLast = segIdx === shownSegments.length - 1;
                return (
                  <div
                    key={seg.index}
                    ref={(el) => { segmentRefs.current[seg.index] = el; }}
                    className="flex gap-4 items-start"
                  >
                    {/* 左列：节点 + 连接线 */}
                    <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300
                        ${isActive
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/40 scale-110"
                          : isPast
                          ? "bg-gray-800 border-gray-700 text-gray-500"
                          : "bg-gray-800 border-indigo-500/50 text-indigo-400"}`}>
                        {isPast
                          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          : segIdx + 1}
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 mt-2 min-h-[24px] bg-gradient-to-b from-indigo-500/30 to-white/5" />
                      )}
                    </div>

                    {/* 右列：状态标签 + 卡片 */}
                    <div className="flex-1 min-w-0 pb-2">
                      {/* 状态标签行 */}
                      <div className="flex items-center gap-2 mb-2 h-5">
                        {isActive && (
                          <div className="flex items-center gap-1.5 text-indigo-400 text-xs">
                            <span className="flex gap-0.5 items-end h-3">
                              {[0,1,2].map(i => (
                                <span key={i} className="w-0.5 rounded-full bg-indigo-400 animate-sound-wave"
                                  style={{ animationDelay: `${i*0.15}s`, minHeight: "4px" }} />
                              ))}
                            </span>
                            讲解中
                          </div>
                        )}
                        {isPast && (
                          <span className="text-[10px] text-gray-600">已讲完</span>
                        )}
                      </div>

                      {/* 卡片 */}
                      <div className={`rounded-2xl border transition-all duration-500
                        ${isActive
                          ? "border-indigo-500/30 bg-indigo-950/20 shadow-xl shadow-indigo-500/10"
                          : isPast
                          ? "border-white/5 bg-white/[0.015]"
                          : "border-white/8 bg-white/[0.02]"}
                        p-5`}
                      >
                        <VisualPanel
                          segment={seg}
                          isActive={isActive}
                          isPast={isPast}
                          speechProgress={isActive ? speechProgress : undefined}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>{/* end space-y-6 */}

            {/* 整课完成 */}
            {isDone && shownSegments.length > 0 && Object.values(segmentStates).every((s) => s === "understood") && (
              <div className="mt-6 ml-12 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-900/30 border border-green-700/40 rounded-full text-green-400 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  课程全部学完啦！点击右下角查看完整记录
                </div>
              </div>
            )}
          </div>{/* end mt-10 */}
        </div>{/* end max-w-3xl */}
      </div>{/* end overflow-y-auto */}

      {/* 底部字幕栏 */}
      <SubtitleBar
        text={subtitleText}
        isVisible={currentIndex >= 0 || shownSegments.length > 0}
        isDone={isDone && !isSpeaking}
        segmentState={currentState as "speaking" | "waiting" | "simplifying" | "idle"}
        speechCharIndex={subtitleCharIndex}
        onUnderstood={handleUnderstood}
        onSkipReading={handleSkipReading}
        onSimplify={handleSimplify}
        onOpenTranscript={() => setTranscriptOpen(true)}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onChatSubmit={handleChat}
        isChatLoading={isChatLoading}
        chatAnswer={chatAnswer}
        chatSpeechState={chatSpeechState}
        onToggleChatSpeech={handleToggleChatSpeech}
        onStopChatSpeech={handleStopChatSpeech}
        onClearChatAnswer={handleClearChatAnswer}
      />

      {/* 记录抽屉 */}
      <TranscriptDrawer
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        segments={shownSegments}
        chatHistory={chatHistory}
        title={title}
      />

      {/* iOS 移动端解锁朗读 overlay */}
      {needsUserTap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-sm cursor-pointer"
          onClick={unlockSpeech}
        >
          <div className="flex flex-col items-center gap-5 animate-fade-in px-8 text-center">
            <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <svg className="w-12 h-12 text-white ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-white text-2xl font-semibold">点击开始学习</p>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              移动端浏览器需要用户授权才能播放语音<br />内容已准备好，点击任意处开始朗读
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
