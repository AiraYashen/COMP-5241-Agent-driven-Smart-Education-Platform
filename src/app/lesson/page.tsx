import { Suspense } from "react";
import LessonModeWrapper from "@/components/LessonModeWrapper";

export default function LessonPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const question = params.q ?? "";

  return (
    <LessonModeWrapper question={decodeURIComponent(question)} />
  );
}
