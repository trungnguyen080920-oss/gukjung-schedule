import { Flame, CreditCard, Clock, BookOpenCheck } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Props {
  stats: {
    totalSubjects: number;
    totalStudySec: number;
    bestStreak: number;
    totalCards: number;
    totalNotes: number;
  };
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[var(--shadow-sm)]">
      <div className="rounded-lg p-2" style={{ backgroundColor: color + "18", color }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-[var(--text-muted)] leading-none mb-1">{label}</p>
        <p className="text-lg font-bold leading-none">{value}</p>
      </div>
    </div>
  );
}

export function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={<BookOpenCheck size={18} />} label="Tổng note" value={stats.totalNotes.toLocaleString()} color="#6366f1" />
      <StatCard icon={<CreditCard size={18} />}   label="Tổng thẻ"  value={stats.totalCards.toLocaleString()} color="#06b6d4" />
      <StatCard icon={<Clock size={18} />}         label="Thời gian" value={formatDuration(stats.totalStudySec)} color="#f59e0b" />
      <StatCard icon={<Flame size={18} />}         label="Streak dài nhất" value={`${stats.bestStreak} ngày`} color="#ef4444" />
    </div>
  );
}
