"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface School {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    supabase.from("schools").select("id, name").then(({ data }) => {
      if (data) setSchools(data);
    });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleGetCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的手机号");
      return;
    }
    setError("");
    setCountdown(60);
    // Mock: no real SMS. Show hint.
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "otp") {
        if (!/^\d{6}$/.test(otp)) {
          setError("请输入6位验证码");
          return;
        }
        result = await signIn("phone-otp", {
          phone,
          otp,
          schoolId,
          redirect: false,
        });
      } else {
        if (!password) {
          setError("请输入密码");
          return;
        }
        result = await signIn("credentials", {
          phone,
          password,
          redirect: false,
        });
      }
      if (result?.error) {
        setError("手机号或验证码/密码错误，请重试");
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent)" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl"
            style={{ background: "var(--accent)" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422A12 12 0 0112 21.5a12 12 0 01-6.16-10.922L12 14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>EduPlatform</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>智慧教育平台</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8 shadow-2xl"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          {/* Mode tabs */}
          <div className="flex rounded-lg p-1 mb-6" style={{ background: "var(--background)" }}>
            {(["otp", "password"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                }}
              >
                {m === "otp" ? "验证码登录" : "密码登录"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* School selector */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>选择学校</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
              >
                <option value="">-- 请选择学校 --</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
                required
              />
            </div>

            {mode === "otp" ? (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="请输入验证码"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                    style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
                  />
                  <button
                    type="button"
                    onClick={handleGetCode}
                    disabled={countdown > 0}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all whitespace-nowrap"
                    style={{ background: countdown > 0 ? "var(--input-bg)" : "var(--accent)", color: countdown > 0 ? "var(--muted)" : "#fff", border: "1px solid var(--input-border)" }}
                  >
                    {countdown > 0 ? `${countdown}s` : "获取验证码"}
                  </button>
                </div>
                {/* Mock tip */}
                <p className="text-xs mt-1.5 px-1" style={{ color: "var(--accent)" }}>
                  演示模式：验证码为 <strong>123456</strong>
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" }}
                />
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  登录中...
                </span>
              ) : "登录"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>
          EduPlatform © 2026 · 教育4.0智慧平台
        </p>

        {/* Demo accounts button */}
        <button
          onClick={() => setShowDemoModal(true)}
          className="w-full mt-3 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--accent)", border: "1px solid" }}
        >
          查看测试账号
        </button>
      </div>

      {/* Demo accounts modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            className="rounded-2xl border p-6 shadow-2xl max-w-md w-full"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                测试账号信息
              </h2>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              以下账号可用于试用应用，验证码为任意6位数字（如 123456）
            </p>

            <div className="space-y-3">
              {/* Admin */}
              <div className="rounded-lg p-3" style={{ background: "var(--background)" }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    管理员
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--accent)", color: "#fff" }}>
                    Admin
                  </span>
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  <div>手机号：<span style={{ color: "var(--accent)" }}>10000000000</span></div>
                  <div className="mt-1">验证码：任意6位数字</div>
                </div>
              </div>

              {/* Teacher */}
              <div className="rounded-lg p-3" style={{ background: "var(--background)" }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    教师
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--accent)", color: "#fff" }}>
                    Teacher
                  </span>
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  <div>手机号：<span style={{ color: "var(--accent)" }}>13800000001</span></div>
                  <div className="mt-1">验证码：任意6位数字</div>
                </div>
              </div>

              {/* Student */}
              <div className="rounded-lg p-3" style={{ background: "var(--background)" }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    学生
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--accent)", color: "#fff" }}>
                    Student
                  </span>
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  <div>手机号：<span style={{ color: "var(--accent)" }}>13800000002</span></div>
                  <div className="mt-1">验证码：任意6位数字</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDemoModal(false)}
              className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
