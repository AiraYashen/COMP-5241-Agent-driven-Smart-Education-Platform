import { Suspense } from "react";
import LessonModeWrapper from "@/components/LessonModeWrapper";
import SearchForm from "@/components/SearchForm";

export default function LessonPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sid?: string }>;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <LessonPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LessonPageContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sid?: string }>;
}) {
  const params = await searchParams;
  const question = params.q ?? "";
  const sid = params.sid ?? "";

  if (!question && !sid) {
    return (
      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">AI 微课</h1>
          <p className="text-gray-400">先填写学习信息并生成微课，再进入讲解页面</p>
        </div>
        <div className="w-full max-w-2xl">
          <SearchForm />
        </div>
      </main>
    );
  }

  return (
    <LessonModeWrapper question={decodeURIComponent(question)} sid={decodeURIComponent(sid)} />
  );
}
