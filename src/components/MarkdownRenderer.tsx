"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github.css";

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
      components={{
        // 段落
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        // 标题
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>
        ),
        // 无序列表
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-0.5 pl-2">{children}</ul>
        ),
        // 有序列表
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-0.5 pl-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        // 行内代码
        code: ({ children, className }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <code className={className}>{children}</code>
            );
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: "rgba(0,0,0,0.08)",
                color: "var(--foreground)",
              }}
            >
              {children}
            </code>
          );
        },
        // 代码块
        pre: ({ children }) => (
          <pre
            className="rounded-lg p-3 mb-2 overflow-x-auto text-xs font-mono"
            style={{ background: "rgba(0,0,0,0.06)", border: "1px solid var(--card-border)" }}
          >
            {children}
          </pre>
        ),
        // 引用块
        blockquote: ({ children }) => (
          <blockquote
            className="border-l-4 pl-3 py-1 mb-2 italic text-sm"
            style={{ borderColor: "var(--accent)", color: "var(--muted)" }}
          >
            {children}
          </blockquote>
        ),
        // 分割线
        hr: () => (
          <hr className="my-3" style={{ borderColor: "var(--card-border)" }} />
        ),
        // 表格
        table: ({ children }) => (
          <div className="overflow-x-auto mb-2">
            <table className="min-w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th
            className="px-3 py-1.5 text-left font-semibold border"
            style={{ background: "rgba(0,0,0,0.05)", borderColor: "var(--card-border)" }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            className="px-3 py-1.5 border"
            style={{ borderColor: "var(--card-border)" }}
          >
            {children}
          </td>
        ),
        // 加粗 / 斜体
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        // 图片
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt ?? "图片"}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", borderRadius: 8, margin: "8px 0", display: "block" }}
          />
        ),
        // 链接
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
