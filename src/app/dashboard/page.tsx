"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Menu, Share2, Download, Key, Settings, Timer } from "lucide-react";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { SubjectMatrixGrid } from "@/components/dashboard/SubjectMatrixGrid";
import { LiveLogStreamer } from "@/components/dashboard/LiveLogStreamer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { AnkiLiveStats } from "@/components/dashboard/AnkiLiveStats";
import { DailyPlanner } from "@/components/dashboard/DailyPlanner";
import { HealthTracker } from "@/components/dashboard/HealthTracker";
import { AICopilot } from "@/components/AICopilot";

// ── Types ──────────────────────────────────────────────────────────────────
interface SubjectEntry {
  subject: { id: string; code: string; name: string; colorHex: string | null; category: { name: string; code: string } };
  progress: {
    totalNotes: number; totalCards: number; masteredCards: number;
    totalStudySec: number; currentStreak: number; longestStreak: number; completionPct: number;
  };
  recentSessions: unknown[];
}
interface Summary {
  user: { id: string; email: string; name: string | null; role: string };
  subjects: SubjectEntry[];
  stats: { totalSubjects: number; totalStudySec: number; bestStreak: number; totalCards: number; totalNotes: number };
}
interface ActivityData { [date: string]: { total: number; bySubject: Record<string, number> } }

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken]             = useState<string | null>(null);
  const [summary, setSummary]         = useState<Summary | null>(null);
  const [activity, setActivity]       = useState<ActivityData>({});
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [shareUrl, setShareUrl]         = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [apiToken, setApiToken]         = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);

  // Auth check
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("pg_token") : null;
    if (!t) { router.replace("/login"); return; }
    setToken(t);
  }, [router]);

  const fetchAll = useCallback(async (t: string) => {
    setLoading(true); setError("");
    try {
      const [sumRes, actRes] = await Promise.all([
        fetch("/api/dashboard/summary",  { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/dashboard/activity", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (sumRes.status === 401) { localStorage.removeItem("pg_token"); router.replace("/login"); return; }
      if (!sumRes.ok) { setError("Không thể tải dữ liệu"); return; }
      const [sumData, actData] = await Promise.all([sumRes.json(), actRes.json()]);
      setSummary(sumData);
      setActivity(actData.activity ?? {});
    } catch {
      setError("Lỗi kết nối mạng");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { if (token) fetchAll(token); }, [token, fetchAll]);

  async function handleShare() {
    if (!token) return;
    setShareLoading(true);
    try {
      const res = await fetch("/api/sharing/create", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
      const d = await res.json();
      if (d.shareUrl) { setShareUrl(d.shareUrl); navigator.clipboard?.writeText(d.shareUrl).catch(() => {}); }
    } finally { setShareLoading(false); }
  }

  async function handleGenerateToken() {
    if (!token) return;
    setTokenLoading(true);
    try {
      const res = await fetch("/api/auth/generate-token", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.apiToken) { setApiToken(d.apiToken); setShowApiToken(true); }
    } finally { setTokenLoading(false); }
  }

  function handleExport() {
    if (!token) return;
    const a = document.createElement("a");
    a.href = `/api/export?format=csv`;
    a.setAttribute("data-token", token); // không dùng được header qua link thường
    // Workaround: fetch → Blob → download
    fetch("/api/export?format=csv", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((b) => { a.href = URL.createObjectURL(b); a.download = `gukjung_progress.csv`; a.click(); });
  }

  function handleLogout() {
    localStorage.removeItem("pg_token");
    localStorage.removeItem("pg_user");
    router.push("/login");
  }

  // Màu heatmap = màu môn đang chọn, hoặc indigo nếu xem tất cả
  const heatmapColor = selectedCode
    ? (summary?.subjects.find((s) => s.subject.code === selectedCode)?.subject.colorHex ?? "#6366f1")
    : "#6366f1";

  // Activity đã lọc theo môn (nếu chọn môn)
  const filteredActivity: ActivityData = selectedCode
    ? Object.fromEntries(
        Object.entries(activity).map(([date, val]) => [
          date,
          { total: val.bySubject[selectedCode] ?? 0, bySubject: val.bySubject },
        ]),
      )
    : activity;

  if (!token) return null;

  const sidebarSubjects = summary?.subjects.map((s) => s.subject) ?? [];

  // Sidebar component (dùng cho cả desktop và mobile drawer)
  const sidebarEl = (
    <Sidebar
      subjects={sidebarSubjects}
      selectedCode={selectedCode}
      onSelect={(code) => { setSelectedCode(code); setSidebarOpen(false); }}
      onLogout={handleLogout}
      userEmail={summary?.user.email}
      userRole={summary?.user.role}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex w-64 shrink-0 flex-col">{sidebarEl}</div>

      {/* Sidebar mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full flex flex-col">{sidebarEl}</div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-base leading-none">
              {selectedCode
                ? (summary?.subjects.find((s) => s.subject.code === selectedCode)?.subject.name ?? selectedCode)
                : "Tổng quan"}
            </h1>
            {summary && (
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                {summary.user.name ?? summary.user.email} · {summary.stats.totalSubjects} môn học
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => token && fetchAll(token)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{loading ? "Đang tải..." : "Làm mới"}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport} title="Xuất CSV">
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare} loading={shareLoading} title="Chia sẻ tiến trình">
              <Share2 size={14} />
              <span className="hidden sm:inline">Chia sẻ</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleGenerateToken} loading={tokenLoading} title="Tạo API Token cho Watcher">
              <Key size={14} />
            </Button>
            <Link href="/pomodoro" target="_blank">
              <Button variant="ghost" size="sm" title="Pomodoro Timer (Ctrl+Shift+P)">
                <Timer size={14} />
              </Button>
            </Link>
            {summary?.user.role === "ADMIN" && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" title="Admin Panel">
                  <Settings size={14} />
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Content scroll area */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">{error}</div>
          )}

          {/* Share URL toast */}
          {shareUrl && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <Share2 size={16} className="text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-indigo-500 mb-0.5">Link chia sẻ (đã copy vào clipboard)</p>
                <p className="text-xs text-[var(--text-muted)] truncate font-mono">{shareUrl}</p>
              </div>
              <button onClick={() => setShareUrl(null)} className="text-[var(--text-subtle)] hover:text-[var(--text)] text-lg leading-none">×</button>
            </div>
          )}

          {/* API Token toast */}
          {showApiToken && apiToken && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <Key size={16} className="text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-500 mb-0.5">API Token mới (lưu ngay — chỉ hiện 1 lần)</p>
                <p className="text-xs text-[var(--text-muted)] font-mono break-all">{apiToken}</p>
              </div>
              <button onClick={() => setShowApiToken(false)} className="text-[var(--text-subtle)] hover:text-[var(--text)] text-lg leading-none">×</button>
            </div>
          )}

          {loading && !summary ? (
            <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Đang tải dữ liệu...</span>
              </div>
            </div>
          ) : summary ? (
            <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">

              {/* Stats bar */}
              <StatsBar stats={summary.stats} />

              {/* Activity Heatmap */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-sm">Hoạt động học tập</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">365 ngày qua</p>
                  </div>
                  {selectedCode && (
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: heatmapColor + "20", color: heatmapColor }}
                    >
                      {selectedCode}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto pb-1">
                  <ActivityHeatmap activity={filteredActivity} color={heatmapColor} />
                </div>
              </Card>

              {/* Subject Matrix */}
              <div>
                <h2 className="font-semibold text-sm mb-3">
                  Không gian học tập
                  {selectedCode && (
                    <button
                      onClick={() => setSelectedCode(undefined)}
                      className="ml-2 text-xs text-indigo-500 hover:underline font-normal"
                    >
                      Xem tất cả
                    </button>
                  )}
                </h2>
                <SubjectMatrixGrid
                  subjects={
                    selectedCode
                      ? summary.subjects.filter((s) => s.subject.code === selectedCode)
                      : summary.subjects
                  }
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                />
              </div>

              {/* Daily Planner + Health — 2 cột */}
              <div className="grid lg:grid-cols-2 gap-4">
                <DailyPlanner token={token!} />
                <HealthTracker token={token!} />
              </div>

              {/* Anki Live + Live Log — 2 cột */}
              <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
                <div>
                  <h2 className="font-semibold text-sm mb-3">Live Log — Đồng bộ thời gian thực</h2>
                  <LiveLogStreamer token={token!} />
                </div>
                <div className="space-y-3">
                  <h2 className="font-semibold text-sm">Anki Live</h2>
                  <AnkiLiveStats />
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </main>

      {/* AI Copilot floating (luôn hiển thị khi đã auth) */}
      <AICopilot
        token={token}
        dashboardContext={{
          subjects: summary?.subjects.map((s) => ({
            name: s.subject.name,
            streak: s.progress.currentStreak,
            totalCards: s.progress.totalCards,
            completionPct: s.progress.completionPct,
          })),
          todayStudySec: summary?.stats.totalStudySec,
        }}
      />
    </div>
  );
}
