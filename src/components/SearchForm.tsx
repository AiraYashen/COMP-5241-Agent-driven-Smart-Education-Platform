"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SearchForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setIsLoading(true);
    router.push(`/lesson?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500" />
        <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl p-2 flex gap-2 border border-white/10">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="请输入你想了解的问题，例如：什么是光合作用？"
            disabled={isLoading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 text-lg outline-none disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                跳转中
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                开始学习
              </>
            )}
          </button>
        </div>
      </div>

      {/* 示例问题 */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {["光合作用是什么?", "黑洞是怎么形成的?", "DNA是什么?", "为什么天空是蓝色的?"].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuestion(example)}
            className="px-3 py-1.5 text-sm text-gray-400 bg-white/5 hover:bg-white/10 hover:text-gray-200 border border-white/10 rounded-full transition-all duration-200"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
