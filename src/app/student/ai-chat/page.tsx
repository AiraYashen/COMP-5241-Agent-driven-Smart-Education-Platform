"use client";
import { useEffect, useRef, useState } from "react";
import { Card, Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  hasImage?: boolean;
  timestamp?: number;
}

interface TaConfig {
  name: string;
  avatar_emoji: string;
  system_prompt: string | null;
  knowledge_text: string | null;
}

function storageKey(userId: string) {
  return `ai_chat_history_${userId}`;
}

export default function AiChatPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id ?? "";
  const [ta, setTa] = useState<TaConfig | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load AI TA config for student's class
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: enrollment } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", userId)
        .limit(1)
        .single();

      if (enrollment?.class_id) {
        const { data: assistant } = await supabase
          .from("ai_assistants")
          .select("name, avatar_emoji, system_prompt, knowledge_text")
          .eq("class_id", enrollment.class_id)
          .limit(1)
          .single();
        if (assistant) setTa(assistant);
      }
    };
    load();
  }, [userId]);

  const taName = ta?.name ?? "AI \u5b66\u4e60\u52a9\u624b";
  const taEmoji = ta?.avatar_emoji ?? "\uD83E\uDD16";

  // Load chat history from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const saved: Message[] = JSON.parse(raw);
        if (saved.length > 0) { setMessages(saved); setHydrated(true); return; }
      }
    } catch {
      // ignore parse errors
    }
    setMessages([{
      role: "assistant",
      content: `\u4f60\u597d\uff01\u6211\u662f${taName}\uff0c\u4f60\u53ef\u4ee5\u95ee\u6211\u4efb\u4f55\u5b66\u4e60\u4e0a\u7684\u95ee\u9898\uff0c\u4e5f\u53ef\u4ee5\u4e0a\u4f20\u4f5c\u4e1a\u56fe\u7247\u8ba9\u6211\u5e2e\u4f60\u89e3\u9898\uff01`,
      timestamp: 0,
    }]);
    setHydrated(true);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist history (strip base64 image data)
  useEffect(() => {
    if (!userId || !hydrated) return;
    try {
      const toSave = messages.map(({ image: _img, ...rest }) => rest);
      localStorage.setItem(storageKey(userId), JSON.stringify(toSave));
    } catch {
      // ignore storage errors
    }
  }, [messages, userId, hydrated]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleClear = () => {
    const fresh: Message = {
      role: "assistant",
      content: `\u4f60\u597d\uff01\u6211\u662f${taName}\uff0c\u4f60\u53ef\u4ee5\u95ee\u6211\u4efb\u4f55\u5b66\u4e60\u4e0a\u7684\u95ee\u9898\uff0c\u4e5f\u53ef\u4ee5\u4e0a\u4f20\u4f5c\u4e1a\u56fe\u7247\u8ba9\u6211\u5e2e\u4f60\u89e3\u9898\uff01`,
      timestamp: Date.now(),
    };
    setMessages([fresh]);
    if (userId) localStorage.removeItem(storageKey(userId));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const buildSystemPrompt = () => {
    const base = ta?.system_prompt ?? "\u4f60\u662f\u4e00\u4f4d\u8010\u5fc3\u7684AI\u8f85\u5bfc\u8001\u5e08\uff0c\u64c5\u957f\u5e2e\u5b66\u751f\u89e3\u9898\u548c\u7b54\u7591\u3002\u8bf7\u7528\u901a\u4fd7\u6613\u61c2\u7684\u8bed\u8a00\u8be6\u7ec6\u89e3\u7b54\uff0c\u591a\u7528\u6bd4\u55fb\u548c\u6b65\u9aa4\u8bf4\u660e\u3002";
    if (ta?.knowledge_text) {
      return base + "\n\n\u300c\u77e5\u8bc6\u5e93\u53c2\u8003\u8d44\u6599\u300d\n" + ta.knowledge_text;
    }
    return base;
  };

  const sendMessage = async () => {
    if (!input.trim() && !image) return;
    const userMsg: Message = {
      role: "user",
      content: input,
      image: image ?? undefined,
      hasImage: image != null,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setImage(null);
    setLoading(true);

    try {
      // Build history: last 20 messages excluding the one just added, strip image data
      const history = [...messages, userMsg]
        .filter((m) => !m.hasImage) // exclude messages that were image-only
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));
      // Remove the last entry (current user message) to avoid duplication;
      // route will append it internally
      const historyToSend = history.slice(0, -1);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input || "请帮我解答这道题",
          imageBase64: image,
          systemPrompt: buildSystemPrompt(),
          history: image ? [] : historyToSend,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      setMessages((prev) => [...prev, { role: "assistant", content: text, timestamp: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "\u629c\u6b49\uff0cAI \u6682\u65f6\u65e0\u6cd5\u56de\u7b54\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <svg fill="none" stroke="#fff" viewBox="0 0 24 24" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{taName}</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>问我任何学习问题，或上传作业图片解题</p>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-colors"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
          title="\u6e05\u9664\u6240\u6709\u804a\u5929\u8bb0\u5f55"
        >
          清除记录
        </button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto mb-4" style={{ minHeight: 0 }}>
        <div className="space-y-4 p-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: msg.role === "assistant" ? "var(--accent)" : "#3b82f6" }}
              >
                {msg.role === "assistant" ? "AI" : (session?.user?.name?.charAt(0) ?? "\u6211")}
              </div>
              <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
                {msg.image && (
                  <img src={msg.image} alt="uploaded" className="max-w-xs rounded-xl" />
                )}
                {msg.content && (
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: msg.role === "user" ? "var(--accent)" : "var(--background)",
                      color: msg.role === "user" ? "#fff" : "var(--foreground)",
                      border: msg.role === "assistant" ? "1px solid var(--card-border)" : "none",
                    }}
                  >
                    {msg.role === "assistant" ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "var(--accent)" }}>AI</div>
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--muted)" }}>
                <span className="animate-pulse">正在思考中…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      {/* Input area */}
      <Card>
        {image && (
          <div className="mb-3 flex items-center gap-2">
            <img src={image} alt="preview" className="h-16 rounded-lg object-cover" />
            <button onClick={() => setImage(null)} className="text-xs" style={{ color: "var(--muted)" }}>✕ 移除</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <label
            className="p-2 rounded-lg cursor-pointer transition-all flex-shrink-0"
            style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--muted)" }}
            title="\u4e0a\u4f20\u56fe\u7247"
          >
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="输入问题，按 Enter 发送（Shift+Enter 换行）"
            className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
          />
          <Button onClick={sendMessage} disabled={!input.trim() && !image} loading={loading} className="flex-shrink-0">发送</Button>
        </div>
      </Card>
    </div>
  );
}