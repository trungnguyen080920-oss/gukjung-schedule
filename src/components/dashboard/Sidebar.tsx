"use client";
import { GraduationCap, BarChart3, LogOut, ChevronRight, CalendarDays, Heart, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Subject {
  code: string;
  name: string;
  colorHex: string | null;
  category: { name: string };
}

interface Props {
  subjects: Subject[];
  selectedCode?: string;
  onSelect?: (code: string | undefined) => void;
  onLogout?: () => void;
  userEmail?: string;
  userRole?: string;
}

const TOP_NAV = [
  { href: "/dashboard",  label: "Tổng quan",      Icon: BarChart3,    color: "#6366f1" },
  { href: "/planner",    label: "Daily Planner",   Icon: CalendarDays, color: "#10B981" },
  { href: "/health",     label: "Sức khoẻ",        Icon: Heart,        color: "#EF4444" },
];

export function Sidebar({ subjects, selectedCode, onSelect, onLogout, userEmail, userRole }: Props) {
  const pathname = usePathname();

  const byCategory: Record<string, Subject[]> = {};
  for (const s of subjects) {
    const cat = s.category.name;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }

  return (
    <aside className="flex flex-col h-full w-full bg-[var(--bg-sidebar)] border-r border-[var(--border)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-none">GUKJUNG Schedule</p>
          <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">Mission Control</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Top-level navigation */}
        {TOP_NAV.map(({ href, label, Icon, color }) => {
          const isActive = pathname === href && !selectedCode;
          return (
            <Link key={href} href={href}
              onClick={() => onSelect?.(undefined)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "font-medium"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
              }`}
              style={isActive ? { backgroundColor: color + "18", color } : {}}>
              <Icon size={15} style={isActive ? { color } : {}} />
              <span>{label}</span>
              {isActive && <ChevronRight size={13} className="ml-auto" />}
            </Link>
          );
        })}

        {/* Divider trước subjects */}
        {subjects.length > 0 && (
          <div className="pt-2 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-3 mb-1">
              Môn học
            </p>
            {/* All subjects */}
            <button
              onClick={() => { onSelect?.(undefined); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                pathname === "/dashboard" && !selectedCode
                  ? "bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 font-medium"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
              }`}>
              <BarChart3 size={14} />
              <span>Tất cả môn</span>
            </button>
          </div>
        )}

        {/* Categories + subjects */}
        {Object.entries(byCategory).map(([cat, subs]) => (
          <div key={cat}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-3 py-1">
              {cat}
            </p>
            {subs.map((s) => {
              const isActive = selectedCode === s.code;
              return (
                <button key={s.code}
                  onClick={() => onSelect?.(isActive ? undefined : s.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                    isActive ? "font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
                  }`}
                  style={isActive ? { backgroundColor: (s.colorHex ?? "#6366f1") + "20", color: s.colorHex ?? "#6366f1" } : {}}>
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.colorHex ?? "var(--text-subtle)" }} />
                  <span className="truncate text-left">{s.name}</span>
                  {isActive && <ChevronRight size={13} className="ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}

        {/* Admin link */}
        {userRole === "ADMIN" && (
          <div className="pt-2 border-t border-[var(--border)] mt-2">
            <Link href="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] transition-colors">
              <Shield size={14} />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)] flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{userEmail ?? "User"}</p>
        </div>
        <ThemeToggle />
        <button onClick={onLogout}
          className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Đăng xuất">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
