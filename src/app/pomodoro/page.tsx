"use client";
// /pomodoro — Floating Pomodoro Timer (mở từ System Tray hoặc dashboard)
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, BookOpen, X } from "lucide-react";

type Phase = "work" | "break" | "longBreak";

const PHASES: Record<Phase, { label: string; sec: number; color: string }> = {
  work:      { label: "Học tập", sec: 25 * 60, color: "#6366f1" },
  break:     { label: "Nghỉ ngắn", sec: 5 * 60,  color: "#10B981" },
  longBreak: { label: "Nghỉ dài",  sec: 15 * 60, color: "#3B82F6" },
};

export default function PomodoroPage() {
  const [phase, setPhase]     = useState<Phase>("work");
  const [remaining, setRem]   = useState(PHASES.work.sec);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const current = PHASES[phase];
  const pct = ((current.sec - remaining) / current.sec) * 100;
  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  const switchPhase = useCallback((next: Phase) => {
    setPhase(next);
    setRem(PHASES[next].sec);
    setRunning(false);
  }, []);

  const handleComplete = useCallback(() => {
    setRunning(false);
    if (phase === "work") {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("🍅 Pomodoro xong!", { body: "Hãy nghỉ giải lao." });
      }
      switchPhase(newSessions % 4 === 0 ? "longBreak" : "break");
    } else {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("⚡ Bắt đầu học!", { body: "Hết giờ nghỉ — quay lại tập trung." });
      }
      switchPhase("work");
    }
  }, [phase, sessions, switchPhase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRem((r) => {
          if (r <= 1) { handleComplete(); return 0; }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handleComplete]);

  // Xin phép thông báo
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const circumference = 2 * Math.PI * 54;
  const strokeDash    = circumference - (pct / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      <div className="text-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {/* Nút đóng (khi chạy trong Electron frame=false) */}
        {typeof window !== "undefined" && (window as {electronAPI?: {isElectron?: boolean}}).electronAPI?.isElectron && (
          <button onClick={() => window.close()}
            className="fixed top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
            <X size={12} />
          </button>
        )}

        {/* Phase switcher */}
        <div className="flex gap-1.5 justify-center mb-6">
          {(Object.keys(PHASES) as Phase[]).map((p) => (
            <button key={p} onClick={() => switchPhase(p)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={phase === p
                ? { backgroundColor: current.color + "30", color: current.color, border: `1px solid ${current.color}40` }
                : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {PHASES[p].label}
            </button>
          ))}
        </div>

        {/* Circle timer */}
        <div className="relative w-36 h-36 mx-auto mb-6">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            <circle cx="60" cy="60" r="54" fill="none"
              stroke={current.color} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-white">{mins}:{secs}</span>
            <span className="text-[10px] text-white/40 mt-0.5">{current.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { setRem(current.sec); setRunning(false); }}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => setRunning((v) => !v)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: current.color, boxShadow: `0 8px 24px ${current.color}50` }}>
            {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
          </button>
          <button onClick={() => switchPhase(phase === "work" ? "break" : "work")}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors">
            {phase === "work" ? <Coffee size={16} /> : <BookOpen size={16} />}
          </button>
        </div>

        {/* Session counter */}
        <div className="flex gap-1.5 justify-center mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: i < sessions % 4 ? current.color : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        <p className="text-[10px] text-white/30 mt-2">
          {sessions} pomodoro hoàn thành hôm nay
        </p>
      </div>
    </div>
  );
}
