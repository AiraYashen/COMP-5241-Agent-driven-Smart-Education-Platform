import SearchForm from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-950/10 rounded-full blur-3xl" />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-8 shadow-2xl shadow-indigo-500/25">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          AI 老师
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"> 讲堂</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-lg mx-auto leading-relaxed">
          输入任何问题，AI 老师将为你生动讲解
          <br />
          <span className="text-gray-500 text-base">配有语音朗读、配图，以及实时字幕</span>
        </p>
      </div>

      {/* 搜索框 */}
      <div className="relative z-10 w-full max-w-2xl">
        <SearchForm />
      </div>

      {/* 特性说明 */}
      <div className="relative z-10 mt-16 grid grid-cols-3 gap-6 max-w-lg">
        {[
          { label: "语音讲解" },
          { label: "智能配图" },
          { label: "实时字幕" },
        ].map((f) => (
          <div key={f.label} className="text-center">
            <div className="text-gray-500 text-sm">{f.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
