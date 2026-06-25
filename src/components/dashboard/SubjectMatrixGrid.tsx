"use client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Flame, BookOpen, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface SubjectProgress {
  subject: { id: string; code: string; name: string; colorHex: string | null; category: { name: string } };
  progress: {
    totalNotes: number; totalCards: number; masteredCards: number;
    totalStudySec: number; currentStreak: number; longestStreak: number;
    completionPct: number;
  };
}

interface Props {
  subjects: SubjectProgress[];
  selectedCode?: string;
  onSelect?: (code: string | undefined) => void;
}

// Vòng tròn SVG progress
function CircleProgress({ pct, color }: { pct: number; color: string }) {
  const r = 20; const circ = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--bg-muted)" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={circ - (pct / 100) * circ}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

export function SubjectMatrixGrid({ subjects, selectedCode, onSelect }: Props) {
  if (!subjects.length) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
        <p>Chưa có dữ liệu học. Hãy đồng bộ Watcher để bắt đầu!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {subjects.map(({ subject, progress }) => {
        const color = subject.colorHex ?? "#6366f1";
        const isSelected = selectedCode === subject.code;

        return (
          <Card
            key={subject.id}
            hover
            className={`flex flex-col gap-3 transition-all ${isSelected ? "ring-2" : "ring-0"}`}
            style={isSelected ? { ringColor: color } as React.CSSProperties : undefined}
            onClick={() => onSelect?.(isSelected ? undefined : subject.code)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-[var(--text-subtle)] truncate">{subject.category.name}</span>
                </div>
                <p className="font-semibold text-sm leading-tight line-clamp-2">{subject.name}</p>
              </div>
              <CircleProgress pct={progress.completionPct} color={color} />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {progress.totalNotes.toLocaleString()} note
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(progress.totalStudySec)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mb-1">
                <span>Đã thuộc</span>
                <span>{progress.masteredCards}/{progress.totalCards} thẻ</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress.completionPct}%`, backgroundColor: color }}
                />
              </div>
            </div>

            {/* Streak badge */}
            {progress.currentStreak > 0 && (
              <Badge color={color} className="self-start">
                <Flame size={10} />
                {progress.currentStreak} ngày liên tiếp
              </Badge>
            )}
          </Card>
        );
      })}
    </div>
  );
}
