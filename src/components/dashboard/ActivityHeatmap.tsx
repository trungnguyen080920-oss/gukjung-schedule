"use client";
import { buildCalendarWeeks, heatIntensity, hexAlpha, formatDate } from "@/lib/utils";
import { useState } from "react";

interface ActivityData {
  [date: string]: { total: number; bySubject: Record<string, number> };
}

interface Props {
  activity: ActivityData;
  color?: string; // subject hex color; default = indigo
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function ActivityHeatmap({ activity, color = "#6366f1" }: Props) {
  const weeks = buildCalendarWeeks(365);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // Month labels: find first week where month changes
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: wi }); lastMonth = m; }
  });

  const alphas = [0, 0.2, 0.45, 0.7, 1] as const;

  function cellColor(count: number) {
    const a = alphas[heatIntensity(count)];
    if (a === 0) return "var(--bg-muted)";
    return hexAlpha(color, a);
  }

  return (
    <div className="relative select-none">
      {/* Month labels */}
      <div className="flex ml-7 mb-1" style={{ gap: 3 }}>
        {weeks.map((_, wi) => {
          const lbl = monthLabels.find((m) => m.col === wi);
          return (
            <div key={wi} className="text-[10px] text-[var(--text-subtle)] w-[11px] shrink-0">
              {lbl?.label ?? ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col justify-between py-[2px] mr-1" style={{ gap: 3 }}>
          {DAYS.map((d, i) => (
            <span key={i} className="text-[10px] leading-none text-[var(--text-subtle)] w-5 text-right">
              {i % 2 === 1 ? d : ""}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex" style={{ gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: 3 }}>
              {week.map((day, di) => {
                const key = day.toISOString().slice(0, 10);
                const count = activity[key]?.total ?? 0;
                const isFuture = day > new Date();
                return (
                  <div
                    key={di}
                    className="w-[11px] h-[11px] rounded-[2px] transition-opacity"
                    style={{
                      backgroundColor: isFuture ? "transparent" : cellColor(count),
                      opacity: isFuture ? 0 : 1,
                      cursor: count > 0 ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => {
                      if (!isFuture) {
                        const rect = (e.target as HTMLDivElement).getBoundingClientRect();
                        setTooltip({ date: key, count, x: rect.left, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 justify-end">
        <span className="text-[10px] text-[var(--text-subtle)]">Ít</span>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <div
            key={i}
            className="w-[11px] h-[11px] rounded-[2px]"
            style={{ backgroundColor: cellColor(i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 5 : i === 3 ? 10 : 20) }}
          />
        ))}
        <span className="text-[10px] text-[var(--text-subtle)]">Nhiều</span>
      </div>

      {/* Tooltip (floating via fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs shadow-lg"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 36,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <span className="font-semibold">{tooltip.count} note</span>
          <span className="text-[var(--text-muted)] ml-1">— {formatDate(tooltip.date)}</span>
        </div>
      )}
    </div>
  );
}
