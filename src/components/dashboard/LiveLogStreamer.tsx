"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal, RefreshCw, Pause, Play } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface Session {
  id: string;
  batchId: string | null;
  noteCount: number;
  cardCount: number;
  layer: string | null;
  durationSec: number;
  studiedAt: string;
  subject: { code: string; name: string; colorHex: string | null };
}

interface Props {
  token: string;
  pollInterval?: number; // ms, default 5000
}

export function LiveLogStreamer({ token, pollInterval = 5000 }: Props) {
  const [logs, setLogs] = useState<Session[]>([]);
  const [paused, setPaused] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<string | undefined>(undefined);

  const fetchSessions = useCallback(async () => {
    if (paused) return;
    try {
      const url = `/api/dashboard/recent-sessions?limit=20${afterRef.current ? `&after=${encodeURIComponent(afterRef.current)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json() as { sessions: Session[]; timestamp: string };
      setConnected(true);
      setLastFetch(data.timestamp);
      if (data.sessions.length > 0) {
        // sessions là desc-sorted; đảo ngược để append theo thứ tự thời gian
        const newSessions = [...data.sessions].reverse();
        setLogs((prev) => {
          const combined = [...prev, ...newSessions];
          // Giữ tối đa 100 entries
          return combined.slice(-100);
        });
        afterRef.current = data.sessions[0].studiedAt; // newest = first in desc list
      }
    } catch {
      setConnected(false);
    }
  }, [token, paused]);

  // Initial load — không filter theo `after` để lấy 20 gần nhất
  useEffect(() => {
    const loadInitial = async () => {
      const res = await fetch("/api/dashboard/recent-sessions?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as { sessions: Session[]; timestamp: string };
      const sorted = [...data.sessions].reverse();
      setLogs(sorted);
      setConnected(true);
      if (data.sessions.length > 0) afterRef.current = data.sessions[0].studiedAt;
    };
    loadInitial();
  }, [token]);

  // Polling
  useEffect(() => {
    const id = setInterval(fetchSessions, pollInterval);
    return () => clearInterval(id);
  }, [fetchSessions, pollInterval]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col h-full min-h-[280px] rounded-xl overflow-hidden border border-[var(--border)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--terminal-bg)] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <Terminal size={13} className="text-white/40 ml-2" />
          <span className="text-xs text-white/40 terminal-font">gukjung-live-log</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
            title={connected ? "Kết nối" : "Mất kết nối"}
          />
          {lastFetch && (
            <span className="text-[10px] text-white/30 terminal-font">
              {formatTime(lastFetch)}
            </span>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-white/40 hover:text-white/70 transition-colors"
            title={paused ? "Tiếp tục" : "Tạm dừng"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            onClick={fetchSessions}
            className="text-white/40 hover:text-white/70 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={termRef}
        className="flex-1 overflow-y-auto p-4 terminal-font text-xs leading-5"
        style={{ backgroundColor: "var(--terminal-bg)", color: "var(--terminal-text)" }}
      >
        {logs.length === 0 ? (
          <div className="text-white/30 py-4 text-center">
            Chưa có log. Đồng bộ thẻ Anki để bắt đầu...
          </div>
        ) : (
          logs.map((s) => (
            <div key={s.id} className="flex items-start gap-2 py-0.5 hover:bg-white/5 rounded px-1">
              <span className="text-white/30 shrink-0 w-[5.5rem]">{formatTime(s.studiedAt)}</span>
              <span className="text-green-400 shrink-0">✓</span>
              <span style={{ color: s.subject.colorHex ?? "#818cf8" }} className="shrink-0 font-bold">
                [{s.subject.code}]
              </span>
              {s.layer && <span className="text-yellow-400/80 shrink-0">{s.layer}</span>}
              <span className="text-white/70">
                +{s.noteCount} note / {s.cardCount} thẻ
              </span>
              {s.batchId && (
                <span className="text-white/25 truncate hidden sm:block">{s.batchId}</span>
              )}
            </div>
          ))
        )}
        {paused && (
          <div className="text-yellow-400/60 mt-2 border-t border-white/5 pt-2">
            ⏸ Đã tạm dừng — nhấn ▶ để tiếp tục
          </div>
        )}
      </div>
    </div>
  );
}
