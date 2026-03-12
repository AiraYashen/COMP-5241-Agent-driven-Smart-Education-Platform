"use client";
import { useState } from "react";
import { Card, Button } from "@/components/ui";

export default function GradingPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; comments: string; details: string[] } | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGrade = async () => {
    if (!imageFile || !imagePreview) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/auto-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imagePreview }),
      });
      if (!res.ok) throw new Error("请求失败");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("AI判分失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>自动改题</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>上传作业图片，AI自动判分并给出评语</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>上传作业图片</h3>
          <label
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all h-48"
            style={{ borderColor: "var(--card-border)", background: "var(--background)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--card-border)")}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <div className="text-center p-6">
                <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>点击上传或拖拽图片</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>支持 JPG、PNG、HEIC 等格式</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
          <Button
            className="w-full mt-4"
            loading={loading}
            disabled={!imageFile}
            onClick={handleGrade}
          >
            {loading ? "AI判分中..." : "开始判分"}
          </Button>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>判分结果</h3>
          {!result ? (
            <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-sm" style={{ color: "var(--muted)" }}>等待判分结果...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="flex items-center justify-center h-24 rounded-xl"
                style={{ background: "var(--accent-light)" }}
              >
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: "var(--accent)" }}>
                    {result.score}
                    <span className="text-lg ml-1">/ {result.total}</span>
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: "var(--accent)" }}>
                    得分率 {Math.round((result.score / result.total) * 100)}%
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>综合评语</p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{result.comments}</p>
              </div>
              {result.details && result.details.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>逐题分析</p>
                  <ul className="space-y-1">
                    {result.details.map((d, i) => (
                      <li key={i} className="text-sm" style={{ color: "var(--muted)" }}>• {d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
