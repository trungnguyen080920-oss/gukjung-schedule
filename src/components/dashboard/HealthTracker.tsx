"use client";
// Health Tracker — nước, calories, tập luyện, bữa ăn. Mỗi entry là 1 DB row riêng.
import { useEffect, useState, useCallback } from "react";
import { Heart, Droplets, Flame, Dumbbell, Plus, UtensilsCrossed, Scale, Trash2 } from "lucide-react";

interface WorkoutEntry {
  id: string; name: string; durationMin: number;
  calBurned: number; muscleGroups: string[];
}
interface MealEntry {
  id: string; name: string; calories: number;
  proteinG: number; carbsG: number; fatG: number; timeEaten?: string | null;
}
interface HealthLogData {
  id: string; date: string; waterMl: number;
  calIn: number; calBurned: number; proteinG: number;
  weightKg: number | null; workouts: WorkoutEntry[]; meals: MealEntry[];
  notes: string | null;
}

const WATER_GOAL   = 2500;
const CALORIE_GOAL = 2200;

const QUICK_WORKOUTS = [
  { name: "Push Day",  durationMin: 60, calBurned: 280, muscleGroups: ["Ngực", "Vai", "Tay sau"] },
  { name: "Pull Day",  durationMin: 60, calBurned: 260, muscleGroups: ["Lưng", "Tay trước"] },
  { name: "Leg Day",   durationMin: 70, calBurned: 350, muscleGroups: ["Đùi trước", "Đùi sau", "Mông"] },
  { name: "Cardio",    durationMin: 30, calBurned: 200, muscleGroups: ["Cardio"] },
  { name: "Core",      durationMin: 20, calBurned: 100, muscleGroups: ["Bụng", "Core"] },
];

const QUICK_MEALS = [
  { name: "Cơm trắng 200g",     calories: 260, proteinG: 5,  carbsG: 57, fatG: 0 },
  { name: "Ức gà 150g",         calories: 165, proteinG: 31, carbsG: 0,  fatG: 4 },
  { name: "Trứng luộc ×2",      calories: 140, proteinG: 12, carbsG: 1,  fatG: 10 },
  { name: "Whey Protein scoop",  calories: 120, proteinG: 24, carbsG: 3,  fatG: 2 },
  { name: "Chuối 1 quả",         calories: 90,  proteinG: 1,  carbsG: 23, fatG: 0 },
  { name: "Rau xào dầu olive",   calories: 80,  proteinG: 2,  carbsG: 8,  fatG: 5 },
];

interface Props { token: string }

export function HealthTracker({ token }: Props) {
  const [log, setLog]         = useState<HealthLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [tab, setTab]         = useState<"water" | "calories" | "workout" | "meals">("water");

  const fetchLog = useCallback(async () => {
    const res = await fetch("/api/health", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      // muscleGroups từ DB là JSON string — parse nếu cần
      data.workouts = data.workouts.map((w: WorkoutEntry & { muscleGroups: string | string[] }) => ({
        ...w,
        muscleGroups: typeof w.muscleGroups === "string" ? JSON.parse(w.muscleGroups) : w.muscleGroups,
      }));
      setLog(data);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  async function addWater(ml: number) {
    setBusy(true);
    const res = await fetch("/api/health", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addWater: ml }),
    });
    if (res.ok) {
      const data = await res.json();
      data.workouts = data.workouts.map((w: WorkoutEntry & { muscleGroups: string | string[] }) => ({
        ...w, muscleGroups: typeof w.muscleGroups === "string" ? JSON.parse(w.muscleGroups) : w.muscleGroups,
      }));
      setLog(data);
    }
    setBusy(false);
  }

  async function addWorkout(w: typeof QUICK_WORKOUTS[0]) {
    setBusy(true);
    const res = await fetch("/api/health/workout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(w),
    });
    if (res.ok) await fetchLog();
    setBusy(false);
  }

  async function removeWorkout(id: string) {
    setBusy(true);
    await fetch(`/api/health/workout?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchLog();
    setBusy(false);
  }

  async function addMeal(m: typeof QUICK_MEALS[0]) {
    setBusy(true);
    const res = await fetch("/api/health/meal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, timeEaten: new Date().toTimeString().slice(0, 5) }),
    });
    if (res.ok) await fetchLog();
    setBusy(false);
  }

  async function removeMeal(id: string) {
    setBusy(true);
    await fetch(`/api/health/meal?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchLog();
    setBusy(false);
  }

  if (loading) return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse h-48" />
  );

  const waterPct = Math.min(100, Math.round(((log?.waterMl ?? 0) / WATER_GOAL) * 100));
  const calPct   = Math.min(100, Math.round(((log?.calIn ?? 0) / CALORIE_GOAL) * 100));
  const netCal   = (log?.calIn ?? 0) - (log?.calBurned ?? 0);

  const TABS = [
    { key: "water",    label: "Nước",    Icon: Droplets,        color: "#3B82F6", val: `${((log?.waterMl ?? 0) / 1000).toFixed(1)}L` },
    { key: "calories", label: "Calories", Icon: Flame,           color: "#F59E0B", val: `${log?.calIn ?? 0}` },
    { key: "workout",  label: "Tập",      Icon: Dumbbell,        color: "#EF4444", val: `${log?.workouts.length ?? 0}` },
    { key: "meals",    label: "Bữa ăn",   Icon: UtensilsCrossed, color: "#10B981", val: `${log?.meals.length ?? 0}` },
  ];

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden ${busy ? "opacity-80 pointer-events-none" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 p-4 border-b border-[var(--border)]">
        <Heart size={15} className="text-red-400 shrink-0" />
        <span className="text-sm font-semibold flex-1">Sức khoẻ hôm nay</span>
        {log?.weightKg && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-subtle)]">
            <Scale size={10} />{log.weightKg}kg
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {TABS.map(({ key, label, Icon, color, val }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] transition-colors ${
              tab === key ? "border-b-2" : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)]/30"
            }`}
            style={tab === key ? { borderColor: color, color } : {}}>
            <Icon size={13} />
            <span className="font-semibold">{val}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">

        {/* ── Nước ─────────────────────────────────────────────── */}
        {tab === "water" && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-muted)]">Mục tiêu {WATER_GOAL / 1000}L/ngày</span>
                <span className="font-semibold text-blue-400">{waterPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                <div className="h-full rounded-full bg-blue-400 transition-all duration-500"
                  style={{ width: `${waterPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[150, 250, 330, 500].map((ml) => (
                <button key={ml} onClick={() => addWater(ml)}
                  className="py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-colors">
                  +{ml}ml
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              Đã uống <strong>{((log?.waterMl ?? 0) / 1000).toFixed(2)}L</strong> / {WATER_GOAL / 1000}L
            </p>
          </div>
        )}

        {/* ── Calories ─────────────────────────────────────────── */}
        {tab === "calories" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Nạp vào",  val: log?.calIn ?? 0,    color: "#F59E0B" },
                { label: "Tiêu hao", val: log?.calBurned ?? 0, color: "#EF4444" },
                { label: "Net",      val: netCal,              color: netCal >= 0 ? "#10B981" : "#EF4444" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-[var(--bg-muted)] p-2">
                  <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] text-[var(--text-subtle)]">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mb-1">
                <span>Calories nạp vào ({calPct}% mục tiêu)</span>
                <span>{log?.calIn ?? 0}/{CALORIE_GOAL} kcal</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${calPct}%`, backgroundColor: calPct > 100 ? "#EF4444" : "#F59E0B" }} />
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              Protein: <strong className="text-emerald-400">{log?.proteinG ?? 0}g</strong>
              {(log?.proteinG ?? 0) < 150 && " · Cần thêm protein 💪"}
            </p>
          </div>
        )}

        {/* ── Tập luyện ────────────────────────────────────────── */}
        {tab === "workout" && (
          <div className="space-y-2">
            {(log?.workouts.length ?? 0) === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">Chưa có bài tập nào</p>
            )}
            {(log?.workouts ?? []).map((w) => (
              <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-muted)]/50 text-xs group">
                <Dumbbell size={12} className="text-red-400 shrink-0" />
                <span className="flex-1 font-medium">{w.name}</span>
                <span className="text-[var(--text-subtle)]">{w.durationMin}m</span>
                <span className="text-red-400">-{w.calBurned} kcal</span>
                <button onClick={() => removeWorkout(w.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-red-400 transition-all ml-1">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <p className="text-[10px] text-[var(--text-muted)] font-medium mb-1 mt-2">Thêm nhanh:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_WORKOUTS.map((w) => (
                <button key={w.name} onClick={() => addWorkout(w)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                  <Plus size={10} /> {w.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Bữa ăn ───────────────────────────────────────────── */}
        {tab === "meals" && (
          <div className="space-y-2">
            {(log?.meals.length ?? 0) === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">Chưa log bữa ăn nào</p>
            )}
            {(log?.meals ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-muted)]/50 text-xs group">
                <UtensilsCrossed size={12} className="text-emerald-400 shrink-0" />
                <span className="flex-1 font-medium">{m.name}</span>
                {m.timeEaten && <span className="text-[var(--text-subtle)]">{m.timeEaten}</span>}
                <span className="text-amber-400">{m.calories}kcal</span>
                <span className="text-emerald-400 hidden sm:inline">{m.proteinG}g P</span>
                <button onClick={() => removeMeal(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-red-400 transition-all ml-1">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <p className="text-[10px] text-[var(--text-muted)] font-medium mb-1 mt-2">Thêm nhanh:</p>
            <div className="space-y-1">
              {QUICK_MEALS.map((m) => (
                <button key={m.name} onClick={() => addMeal(m)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                  <Plus size={10} className="shrink-0" />
                  <span className="flex-1 text-left">{m.name}</span>
                  <span className="text-[var(--text-muted)] shrink-0">{m.proteinG}g P</span>
                  <span className="text-amber-400 shrink-0">{m.calories}kcal</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
