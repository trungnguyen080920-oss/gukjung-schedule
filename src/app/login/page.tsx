"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Nếu đã đăng nhập → redirect về dashboard
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("pg_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Đăng nhập thất bại"); return; }
      localStorage.setItem("pg_token", data.token);
      localStorage.setItem("pg_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "linear-gradient(135deg, var(--bg) 0%, var(--bg-sidebar) 100%)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">GUKJUNG Schedule</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Đăng nhập để xem tiến trình học tập</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gukjung.local" required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Đăng nhập
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--text-subtle)] mt-4">
          Dev: <code className="bg-[var(--bg-muted)] px-1.5 py-0.5 rounded">admin123</code>
        </p>
      </div>
    </div>
  );
}
