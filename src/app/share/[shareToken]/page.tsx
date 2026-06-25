// /share/[shareToken] — Trang public không cần đăng nhập
// Hiển thị heatmap + streak + môn học của chủ tài khoản để tạo động lực thi đua
import { GraduationCap, Flame, CreditCard, Trophy } from "lucide-react";
import { getPublicDashboardSummary } from "@/modules/progress/application/get-dashboard-summary.usecase";
import { formatDate } from "@/lib/utils";

interface Props { params: Promise<{ shareToken: string }> }

export default async function SharePage({ params }: Props) {
  const { shareToken } = await params;
  const data = await getPublicDashboardSummary(shareToken);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <GraduationCap size={48} className="mx-auto mb-4 text-[var(--text-subtle)]" />
          <h1 className="text-xl font-bold mb-2">Link không hợp lệ</h1>
          <p className="text-[var(--text-muted)] text-sm">Link này đã hết hạn hoặc bị thu hồi.</p>
        </div>
      </div>
    );
  }

  const bestStreak = Math.max(...data.subjects.map((s) => s.streak.longest), 0);
  const totalCards = data.subjects.reduce((sum, s) => sum + s.totalCards, 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">{data.owner}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">đang học trên GUKJUNG Schedule</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <Trophy size={18} />, label: "Streak dài nhất", value: `${bestStreak} ngày`, color: "#f59e0b" },
            { icon: <CreditCard size={18} />, label: "Tổng thẻ đã học", value: totalCards.toLocaleString(), color: "#6366f1" },
            { icon: <Flame size={18} />, label: "Môn đang theo học", value: data.subjects.length, color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
              <div className="flex justify-center mb-2" style={{ color: s.color }}>{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subject list */}
        <div className="space-y-3">
          {data.subjects.map((s) => (
            <div key={s.subject.code}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.subject.colorHex ?? "#6366f1" }} />
                  <span className="font-semibold text-sm">{s.subject.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Flame size={12} className="text-orange-400" />
                  <span>{s.streak.current} ngày</span>
                  {s.streak.longest > s.streak.current && (
                    <span className="text-[var(--text-subtle)]">(tốt nhất: {s.streak.longest})</span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mb-1">
                  <span>{s.totalCards} thẻ</span>
                  <span>{s.completionPct}% hoàn thành</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${s.completionPct}%`, backgroundColor: s.subject.colorHex ?? "#6366f1" }} />
                </div>
              </div>

              {s.lastStudiedAt && (
                <p className="text-[10px] text-[var(--text-subtle)]">
                  Học gần nhất: {formatDate(s.lastStudiedAt)}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[var(--text-subtle)] mt-8">
          Powered by <span className="font-semibold text-indigo-500">GUKJUNG Schedule</span>
        </p>
      </div>
    </div>
  );
}
