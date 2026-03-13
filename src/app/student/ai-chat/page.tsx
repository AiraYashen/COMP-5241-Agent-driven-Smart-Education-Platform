"use client";
import { useEffect, useRef, useState } from "react";
import { Card, Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  hasImage?: boolean;
  timestamp?: number;
}

interface TaConfig {
  id: string;
  class_id: string;
  class_name?: string;
  subject?: string | null;
  name: string;
  avatar_emoji: string;
  system_prompt: string | null;
  knowledge_text: string | null;
}

function storageKey(userId: string, assistantId: string) {
  return `ai_chat_history_${userId}_${assistantId || "default"}`;
}

function introText(name: string) {
  return `你好！我是${name}，你可以问我任何学习上的问题，也可以上传作业图片让我帮你解题！`;
}

export default function AiChatPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id ?? "";

  const [assistants, setAssistants] = useState<TaConfig[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ta = assistants.find((a) => a.id === selectedAssistantId) ?? null;
  const taName = ta?.name ?? "AI 学习助手";

  // Load AI TA config for student's class(es)
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch("/api/ai-ta/current", { cache: "no-store" });
        const data = await res.json();
        const list = (data.assistants ?? []) as TaConfig[];
        setAssistants(list);
        if (list.length > 0) {
          setSelectedAssistantId((prev) => prev || list[0].id);
        }
      } catch {
        setAssistants([]);
      }
    };
    load();
  }, [userId]);

  // Load chat history from localStorage (scoped by selected assistant)
  useEffect(() => {
    if (!userId || !selectedAssistantId) return;
    const currentName = ta?.name ?? "AI 学习助手";
    try {
      const raw = localStorage.getItem(storageKey(userId, selectedAssistantId));
      if (raw) {
        const saved: Message[] = JSON.parse(raw);
        if (saved.length > 0) {
          setMessages(saved);
          setHydrated(true);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    setMessages([
      {
        role: "assistant",
        content: introText(currentName),
        timestamp: 0,
      },
    ]);
    setHydrated(true);
  }, [userId, selectedAssistantId, ta?.name]);

  // Persist history (strip base64 image data)
  useEffect(() => {
    if (!userId || !hydrated || !selectedAssistantId) return;
    try {
      const toSave = messages.map(({ image: _img, ...rest }) => rest);
      localStorage.setItem(storageKey(userId, selectedAssistantId), JSON.stringify(toSave));
    } catch {
      // ignore storage errors
    }
  }, [messages, userId, hydrated, selectedAssistantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClear = (assistantName?: string) => {
    const name = assistantName ?? taName;
    const fresh: Message = {
      role: "assistant",
      content: introText(name),
      timestamp: Date.now(),
    };
    setMessages([fresh]);
    if (userId && selectedAssistantId) {
      localStorage.removeItem(storageKey(userId, selectedAssistantId));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const buildSystemPrompt = () => {
    const base =
      ta?.system_prompt ??
      "你是一位耐心的AI辅导老师，擅长帮学生解题和答疑。请用通俗易懂的语言详细解答，多用比喻和步骤说明。";
    if (ta?.knowledge_text) {
      return base + "\n\n「知识库参考资料」\n" + ta.knowledge_text;
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
        .filter((m) => !m.hasImage)
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));
      // Route will append current user question internally.
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，AI 暂时无法回答，请稍后重试。", timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              问我任何学习问题，或上传作业图片解题
              {ta?.class_name ? `  ${ta.class_name}` : ""}
              {ta?.subject ? `  ${ta.subject}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assistants.length > 1 && (
            <select
              value={selectedAssistantId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedAssistantId(nextId);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border focus:outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              title="选择 AI 助教"
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.class_name ? `（${a.class_name}）` : ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => handleClear()}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-colors"
            style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            title="清除所有聊天记录"
          >
            清除记录
          </button>
        </div>
      </div>

      <Card className="flex-1 overflow-y-auto mb-4" style={{ minHeight: 0 }}>
        <div className="space-y-4 p-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: msg.role === "assistant" ? "var(--accent)" : "#3b82f6" }}
              >
                {msg.role === "assistant" ? ta?.avatar_emoji?.slice(0, 2) ?? "AI" : session?.user?.name?.charAt(0) ?? "我"}
              </div>
              <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
                {msg.image && <img src={msg.image} alt="uploaded" className="max-w-xs rounded-xl" />}
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "var(--accent)" }}>
                {ta?.avatar_emoji?.slice(0, 2) ?? "AI"}
              </div>
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--muted)" }}>
                <span className="animate-pulse">正在思考中</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      <Card>
        {image && (
          <div className="mb-3 flex items-center gap-2">
            <img src={image} alt="preview" className="h-16 rounded-lg object-cover" />
            <button onClick={() => setImage(null)} className="text-xs" style={{ color: "var(--muted)" }}>
               移除
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <label
            className="p-2 rounded-lg cursor-pointer transition-all flex-shrink-0"
            style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--muted)" }}
            title="上传图片"
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
          <Button onClick={sendMessage} disabled={!input.trim() && !image} loading={loading} className="flex-shrink-0">
            发送
          </Button>
        </div>
      </Card>
    </div>
  );
}
