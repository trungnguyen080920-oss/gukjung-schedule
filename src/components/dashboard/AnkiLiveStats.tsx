"use client";
// Widget hiển thị thống kê Anki realtime — gọi thẳng AnkiConnect từ browser
import { useEffect, useState, useCallback } from "react";
import { Layers, AlertCircle, RefreshCw, ExternalLink, Zap } from "lucide-react";
import type { AnkiOverview, DeckStats } from "@/lib/anki-connect";

const DECK_COLORS: Record<string, string> = {
  TOEIC: "#3B82F6",
  BCT3:  "#EC4899",
  HSK5:  "#A855F7",
  JP_N3: "#EF4444",
};

function getColor(name: string): string {
  const key = Object.keys(DECK_COLORS).find((k) => name.startsWith(k));
  return key ? DECK_COLORS[key] : "#6366f1";
}

export function AnkiLiveStats() {
  const [overview, setOverview] = useState<AnkiOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Dynamic import để tránh lỗi SSR (AnkiConnect cần browser fetch)
      const { getAnkiOverview } = await import("@/lib/anki-connect");
      const data = await getAnkiOverview();
      setOverview(data);
      setLastUpdate(new Date());
    } catch {
      setOverview({ decks: [], totalDue: 0, totalNew: 0, totalCards: 0, isConnected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Auto-refresh mỗi 60s
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Lắng nghe lệnh sync từ Electron tray
  useEffect(() => {
    if (typeof window === "undefined") return;
    const api = (window as unknown as { electronAPI?: { onTriggerAnkiSync?: (cb: () => void) => void } }).electronAPI;
    api?.onTriggerAnkiSync?.(refresh);
  }, [refresh]);

  if (!overview?.isConnected && !loading) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
          <AlertCircle size={14} className="text-amber-400 shrink-0" />
          <span>Anki chưa mở hoặc AnkiConnect chưa cài.</span>
          <a href="https://ankiweb.net/shared/info/2055492159"
            target="_blank" rel="noreferrer"
            className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 ml-auto">
            Cài addon <ExternalLink size={10} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-indigo-400" />
          <span className="text-xs font-semibold">Anki Live</span>
          {overview?.isConnected && (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>
        <button onClick={refresh} disabled={loading}
          className="p-1 rounded text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !overview ? (
        <div className="flex gap-2">
          {[0,1,2].map((i) => <div key={i} className="h-10 flex-1 rounded-lg bg-[var(--bg-muted)] animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Tổng số nhanh */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Đến hạn",  value: overview?.totalDue ?? 0,   color: "#EF4444" },
              { label: "Mới",      value: overview?.totalNew ?? 0,   color: "#F59E0B" },
              { label: "Tổng thẻ", value: overview?.totalCards ?? 0, color: "#6366f1" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-[var(--bg-muted)] p-2 text-center">
                <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-[var(--text-subtle)]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-deck breakdown */}
          {overview?.decks && overview.decks.length > 0 && (
            <div className="space-y-1.5">
              {overview.decks.slice(0, 6).map((d: DeckStats) => {
                const color = getColor(d.name);
                const due = d.review_count + d.learn_count;
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] flex-1 truncate text-[var(--text-muted)]">
                      {d.name.split("::").pop()}
                    </span>
                    <span className="text-[10px] font-mono text-red-400">{due} đến hạn</span>
                    <span className="text-[10px] font-mono text-amber-400">{d.new_count} mới</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nút học ngay */}
          {(overview?.totalDue ?? 0) > 0 && (
            <button onClick={() => window.open("anki:", "_blank")}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              <Zap size={12} /> Học {overview?.totalDue} thẻ đến hạn ngay
            </button>
          )}

          {lastUpdate && (
            <p className="text-[9px] text-[var(--text-subtle)] text-right mt-2">
              Cập nhật {lastUpdate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
