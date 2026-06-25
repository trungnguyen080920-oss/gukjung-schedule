import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// Tạo mảng 365 ngày từ hôm nay về quá khứ, nhóm thành 52 tuần × 7 ngày
export function buildCalendarWeeks(days = 365): Date[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);

  // Lùi về đầu tuần (Chủ nhật = 0)
  const offset = start.getDay();
  start.setDate(start.getDate() - offset);

  const weeks: Date[][] = [];
  let cur = new Date(start);
  while (cur <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Tính intensity (0-4) dùng cho heatmap
export function heatIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 15) return 3;
  return 4;
}

// Hex màu → rgba với alpha
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
