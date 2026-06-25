"use client";
// Daily Planner — Checklist kế hoạch hôm nay
import { useEffect, useState, useCallback, useRef } from "react";
import { CalendarDays, Plus, Check, Trash2, ChevronDown, ChevronUp, Flame, BookOpen, Dumbbell, Briefcase, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Task {
  id: string; title: string; category: string;
  isCompleted: boolean; priority: number; estimatedMin: number | null;
  subjectCode: string | null;
}
interface Meta { total: number; completed: number; pct: number }

const CATEGORIES = [
  { value: "study",    label: "Học tập",   Icon: BookOpen,   color: "#6366f1" },
  { value: "health",   label: "Sức khoẻ",  Icon: Dumbbell,   color: "#EF4444" },
  { value: "work",     label: "Công việc",  Icon: Briefcase,  color: "#F59E0B" },
  { value: "personal", label: "Cá nhân",   Icon: User,       color: "#10B981" },
];
const PRIORITIES = [
  { value: 1, label: "Bình thường", color: "var(--text-subtle)" },
  { value: 2, label: "Cao",         color: "#F59E0B" },
  { value: 3, label: "Khẩn cấp",   color: "#EF4444" },
];

function catInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[0];
}

interface Props { token: string }

export function DailyPlanner({ token }: Props) {
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [meta, setMeta]     = useState<Meta>({ total: 0, completed: 0, pct: 0 });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [form, setForm]     = useState({ title: "", category: "study", priority: 1, estimatedMin: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/planner", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const d = await res.json();
    setTasks(d.tasks); setMeta(d.meta);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const res = await fetch("/api/planner", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, estimatedMin: form.estimatedMin ? Number(form.estimatedMin) : null }),
    });
    if (res.ok) {
      const d = await res.json();
      setTasks((prev) => [...prev, d.task]);
      setMeta((m) => ({ ...m, total: m.total + 1, pct: Math.round((m.completed / (m.total + 1)) * 100) }));
      setForm({ title: "", category: "study", priority: 1, estimatedMin: "" });
      setAdding(false);
    }
  }

  async function toggleTask(id: string, current: boolean) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, isCompleted: !current } : t));
    const newCompleted = tasks.filter((t) => t.id !== id ? t.isCompleted : !current).length;
    setMeta((m) => ({ ...m, completed: newCompleted, pct: Math.round((newCompleted / m.total) * 100) }));
    await fetch(`/api/planner?id=${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !current }),
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMeta((m) => {
      const newTotal = m.total - 1;
      const task = tasks.find((t) => t.id === id);
      const newCompleted = m.completed - (task?.isCompleted ? 1 : 0);
      return { total: newTotal, completed: newCompleted, pct: newTotal ? Math.round((newCompleted / newTotal) * 100) : 0 };
    });
    await fetch(`/api/planner?id=${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Group tasks by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat, tasks: tasks.filter((t) => t.category === cat.value),
  })).filter((g) => g.tasks.length > 0 || adding);

  const circumference = 2 * Math.PI * 18;
  const dash = circumference - (meta.pct / 100) * circumference;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
        <CalendarDays size={16} className="text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Daily Planner</p>
          <p className="text-[10px] text-[var(--text-muted)] capitalize">{today}</p>
        </div>
        {/* Progress ring */}
        <div className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-muted)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#10B981" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dash}
              style={{ transition: "stroke-dashoffset 0.5s ease" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-400">
            {meta.pct}%
          </span>
        </div>
        <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors">
          <Plus size={15} />
        </button>
      </div>

      {/* Add task form */}
      {adding && (
        <form onSubmit={addTask} className="p-3 border-b border-[var(--border)] bg-[var(--bg-muted)]/40 space-y-2">
          <input ref={inputRef} value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Tên task..." required
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          <div className="flex gap-2">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input value={form.estimatedMin} onChange={(e) => setForm((f) => ({ ...f, estimatedMin: e.target.value }))}
              type="number" min="1" placeholder="Phút"
              className="w-16 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1">Thêm</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Huỷ</Button>
          </div>
        </form>
      )}

      {/* Task list */}
      <div className="divide-y divide-[var(--border)]">
        {loading ? (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">Đang tải...</div>
        ) : tasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-[var(--text-muted)]">Chưa có task nào hôm nay.</p>
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="mt-2 text-xs text-emerald-400 hover:underline">+ Thêm task đầu tiên</button>
          </div>
        ) : (
          grouped.map(({ value, label, Icon, color, tasks: catTasks }) => (
            <div key={value}>
              <button onClick={() => setCollapsed((c) => ({ ...c, [value]: !c[value] }))}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--bg-muted)]/40 transition-colors">
                <Icon size={12} style={{ color }} />
                <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                <span className="text-[10px] text-[var(--text-subtle)] ml-1">
                  {catTasks.filter((t) => t.isCompleted).length}/{catTasks.length}
                </span>
                <span className="ml-auto text-[var(--text-subtle)]">
                  {collapsed[value] ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </span>
              </button>
              {!collapsed[value] && catTasks.map((task) => {
                const pri = PRIORITIES.find((p) => p.value === task.priority) ?? PRIORITIES[0];
                return (
                  <div key={task.id}
                    className={`flex items-center gap-2.5 px-4 py-2.5 group hover:bg-[var(--bg-muted)]/30 transition-colors ${task.isCompleted ? "opacity-50" : ""}`}>
                    <button onClick={() => toggleTask(task.id, task.isCompleted)}
                      className={`w-4.5 h-4.5 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                        task.isCompleted ? "border-emerald-500 bg-emerald-500" : "border-[var(--border)] hover:border-emerald-400"
                      }`}
                      style={{ width: "18px", height: "18px" }}>
                      {task.isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-xs ${task.isCompleted ? "line-through text-[var(--text-subtle)]" : "text-[var(--text)]"}`}>
                      {task.title}
                    </span>
                    {task.priority > 1 && (
                      <Flame size={11} style={{ color: pri.color }} />
                    )}
                    {task.estimatedMin && (
                      <span className="text-[10px] text-[var(--text-subtle)]">{task.estimatedMin}m</span>
                    )}
                    <button onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-subtle)] hover:text-red-400 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer stats */}
      {meta.total > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-subtle)]">
            {meta.completed}/{meta.total} đã hoàn thành
          </span>
          {meta.pct === 100 && (
            <span className="text-[10px] text-emerald-400 font-semibold">🎉 Hoàn thành cả ngày!</span>
          )}
        </div>
      )}
    </div>
  );
}
