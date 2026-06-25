"use client";
// /admin — Admin Panel: thêm/ẩn môn học mà không cần sửa code
// Chỉ user có role ADMIN mới truy cập được (check client-side + server-side)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, EyeOff, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface Subject {
  id: string; name: string; code: string; isActive: boolean; colorHex: string | null;
  category: { name: string; code: string };
}
interface Category { id: string; name: string; code: string }

const PRESET_COLORS = [
  "#6366f1","#3B82F6","#06B6D4","#10B981","#F59E0B","#EF4444","#EC4899","#A855F7","#F97316","#84CC16",
];

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken]       = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  // Form state
  const [form, setForm] = useState({ name: "", code: "", categoryCode: "", colorHex: "#6366f1", description: "" });

  useEffect(() => {
    const t = localStorage.getItem("pg_token");
    const u = localStorage.getItem("pg_user");
    if (!t || !u) { router.replace("/login"); return; }
    const user = JSON.parse(u) as { role: string };
    if (user.role !== "ADMIN") { router.replace("/dashboard"); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/subjects", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setSubjects(d.subjects); setCategories(d.categories); })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSubjects((prev) => [...prev, data.subject]);
      setSuccess(`Đã thêm môn "${data.subject.name}" thành công!`);
      setForm({ name: "", code: "", categoryCode: "", colorHex: "#6366f1", description: "" });
    } finally { setSaving(false); }
  }

  async function toggleActive(code: string, isActive: boolean) {
    await fetch("/api/admin/subjects", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, isActive: !isActive }),
    });
    setSubjects((prev) => prev.map((s) => s.code === code ? { ...s, isActive: !isActive } : s));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)]">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Admin Panel</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Quản lý môn học — không cần sửa code</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add form */}
          <Card>
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Plus size={15} className="text-indigo-500" /> Thêm môn học mới
            </h2>

            {error && <div className="text-red-500 text-xs bg-red-500/10 rounded-lg p-3 mb-3">{error}</div>}
            {success && <div className="text-green-500 text-xs bg-green-500/10 rounded-lg p-3 mb-3">{success}</div>}

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Tên môn học *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ví dụ: Tiếng Pháp DELF B1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Mã môn (code) * — dùng để sync</label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="FR_DELF"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Danh mục *</label>
                <select value={form.categoryCode} onChange={(e) => setForm((f) => ({ ...f, categoryCode: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  required>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Màu chủ đề (heatmap)</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button"
                      onClick={() => setForm((f) => ({ ...f, colorHex: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: form.colorHex === c ? "white" : "transparent" }} />
                  ))}
                  <input type="color" value={form.colorHex}
                    onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                    className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent" title="Chọn màu khác" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Mô tả (tuỳ chọn)</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn về môn học"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
              <Button type="submit" loading={saving} className="w-full mt-2">
                <Plus size={15} /> Thêm môn học
              </Button>
            </form>
          </Card>

          {/* Subject list */}
          <Card>
            <h2 className="font-semibold text-sm mb-4">Danh sách môn học ({subjects.length})</h2>
            {loading ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">Đang tải...</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {subjects.map((s) => (
                  <div key={s.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-opacity ${s.isActive ? "border-[var(--border)]" : "border-dashed border-[var(--border)] opacity-50"}`}>
                    <span className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.colorHex ?? "var(--text-subtle)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-[var(--text-subtle)] font-mono">{s.code} · {s.category.name}</p>
                    </div>
                    <Badge color={s.isActive ? "#10B981" : undefined}>
                      {s.isActive ? "Active" : "Ẩn"}
                    </Badge>
                    <button onClick={() => toggleActive(s.code, s.isActive)}
                      className="p-1 rounded text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
                      title={s.isActive ? "Ẩn môn học" : "Hiện môn học"}>
                      {s.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
