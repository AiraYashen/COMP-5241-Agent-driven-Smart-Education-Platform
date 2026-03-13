"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button } from "@/components/ui";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Assistant {
  id: string;
  class_id: string;
  subject?: string | null;
  name: string;
  avatar_emoji: string;
  system_prompt?: string | null;
  knowledge_text?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TeacherAiChatPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/teacher/ai-ta", { cache: "no-store" });
      const data = await res.json();
      const list = (data.assistants ?? []) as Assistant[];
      setAssistants(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    };
    load();
  }, []);

  const current = useMemo(
    () => assistants.find((a) => a.id === selectedId) ?? null,
    [assistants, selectedId]
  );

  useEffect(() => {
    if (!current) {
      setMessages([]);
      return;
    }
    setMessages([
      {
        role: "assistant",
        content: `你好，我是${current.name}。你可以先问我一个教学问题，我会按你配置的助教设定来回答。`,
      },
    ]);
  }, [current?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildPrompt = () => {
    const base = current?.system_prompt?.trim() || "你是一位耐心的教学助手，请给出清晰、结构化的教学建议。";
    if (current?.knowledge_text?.trim()) {
      return `${base}\n\n「知识库参考资料」\n${current.knowledge_text}`;
    }
    return base;
  };

  const send = async () => {
    const question = input.trim();
    if (!question || !current) return;

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].slice(-20).map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: history.slice(0, -1),
          systemPrompt: buildPrompt(),
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "当前助教暂时不可用，请稍后重试。" }]);
    } finally {
      setLoading(false);
    }
  };

  if (assistants.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>AI 助教试聊</h2>
        <p style={{ color: "var(--muted)" }}>你还没有配置 AI 助教。请先到「AI TA 配置」页面创建后再试聊。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>AI 助教试聊</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>实时验证你配置的角色设定与知识库是否生效。</p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border focus:outline-none"
          style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
        >
          {assistants.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{a.subject ? ` · ${a.subject}` : ""}
            </option>
          ))}
        </select>
      </Card>

      <Card className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: m.role === "user" ? "var(--accent)" : "var(--background)",
                  color: m.role === "user" ? "#fff" : "var(--foreground)",
                  border: m.role === "assistant" ? "1px solid var(--card-border)" : "none",
                }}
              >
                {m.role === "assistant" ? <MarkdownRenderer content={m.content} /> : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>AI 正在思考中...</p>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      <Card>
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            placeholder="输入教学问题，按 Enter 发送（Shift+Enter 换行）"
          />
          <Button onClick={send} loading={loading} disabled={!input.trim()}>发送</Button>
        </div>
      </Card>
    </div>
  );
}
