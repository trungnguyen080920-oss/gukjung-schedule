"use client";
// /health — Trang Health Tracker đầy đủ
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HealthTracker } from "@/components/dashboard/HealthTracker";
import { AICopilot } from "@/components/AICopilot";
import { Menu } from "lucide-react";

interface Summary {
  user: { id: string; email: string; name: string | null; role: string };
  subjects: { subject: { id: string; code: string; name: string; colorHex: string | null; category: { name: string; code: string } }; progress: { totalNotes: number; totalCards: number; masteredCards: number; totalStudySec: number; currentStreak: number; longestStreak: number; completionPct: number }; recentSessions: unknown[] }[];
  stats: { totalSubjects: number; totalStudySec: number; bestStreak: number; totalCards: number; totalNotes: number };
}

export default function HealthPage() {
  const router = useRouter();
  const [token, setToken]   = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthLog, setHealthLog] = useState<{ workouts?: { name: string; muscleGroups: string[] }[] } | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("pg_token");
    if (!t) { router.replace("/login"); return; }
    setToken(t);
    fetch("/api/dashboard/summary", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json()).then(setSummary);
    fetch("/api/health", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json()).then(setHealthLog);
  }, [router]);

  if (!token) return null;

  const sidebarEl = (
    <Sidebar
      subjects={summary?.subjects.map((s) => s.subject) ?? []}
      userEmail={summary?.user.email}
      userRole={summary?.user.role}
      onLogout={() => { localStorage.removeItem("pg_token"); router.push("/login"); }}
    />
  );

  // AI context: thêm health data
  const todayWorkout = healthLog?.workouts?.[0]?.name ?? null;
  const aiContext = {
    subjects: summary?.subjects.map((s) => ({
      name: s.subject.name, streak: s.progress.currentStreak,
      totalCards: s.progress.totalCards, completionPct: s.progress.completionPct,
    })),
    todayStudySec: summary?.stats.totalStudySec,
    todayWorkout,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:flex w-64 shrink-0 flex-col">{sidebarEl}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full flex flex-col">{sidebarEl}</div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="font-bold text-base">Sức khoẻ</h1>
            <p className="text-xs text-[var(--text-muted)]">Theo dõi nước, calo và tập luyện hôm nay</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-2xl mx-auto">
            <HealthTracker token={token} />
          </div>
        </div>
      </main>

      <AICopilot token={token} dashboardContext={aiContext} />
    </div>
  );
}
