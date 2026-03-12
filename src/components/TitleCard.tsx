"use client";

interface TitleCardProps {
  title: string;
}

export default function TitleCard({ title }: TitleCardProps) {
  return (
    <div className="animate-slide-up text-center py-8">
      {/* 装饰线 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <span className="text-indigo-400/60 text-xs uppercase tracking-widest font-medium">AI 课堂</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      </div>

      {/* 标题 */}
      <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
          {title}
        </span>
      </h1>

      {/* 装饰点 */}
      <div className="flex justify-center gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-500"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
