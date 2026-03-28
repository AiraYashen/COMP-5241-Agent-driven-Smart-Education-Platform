"use client";
import { useRouter } from "next/navigation";

export default function BackButton({ label = "返回" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
