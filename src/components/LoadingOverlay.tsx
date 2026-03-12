"use client";

interface LoadingOverlayProps {
  message: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-8">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-purple-900/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* 主加载动画 */}
      <div className="relative">
        {/* 外圈旋转 */}
        <div className="w-24 h-24 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        {/* 中圈反向旋转 */}
        <div className="absolute inset-3 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        {/* 内圈图标 */}
        <div className="absolute inset-6 rounded-full bg-gray-950 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>

      {/* 消息文字 */}
      <div className="text-center">
        <p key={message} className="text-gray-300 text-lg font-medium animate-fade-in">
          {message}
        </p>
        {/* 打字机光标 */}
        <span className="inline-block w-0.5 h-5 bg-indigo-400 ml-1 animate-blink align-middle" />
      </div>

      {/* 提示文字 */}
      <p className="text-gray-600 text-sm">正在调用 AI 生成课程内容，请稍候...</p>
    </div>
  );
}
