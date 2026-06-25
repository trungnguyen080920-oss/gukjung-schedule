"use client";
// AI Copilot — Floating chatbot widget (góc phải màn hình)
// Kết nối Doubao AI qua /api/ai/chat với context dashboard tự động
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Bot, ChevronDown, Sparkles } from "lucide-react";

interface Message { role: "user" | "assistant"; content: string }

interface Props {
  token: string | null;
  // Context dashboard inject vào AI system prompt
  dashboardContext?: {
    subjects?: { name: string; streak: number; totalCards: number; completionPct: number }[];
    todayStudySec?: number;
  };
}

const QUICK_PROMPTS = [
  "Tôi cần ôn gì hôm nay?",
  "Giải thích sự khác biệt giữa 已经 và 曾经",
  "Quiz TOEIC Part 5 nhanh 3 câu",
  "Phân tích streak học tập của tôi",
];

export function AICopilot({ token, dashboardContext }: Props) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Kiểm tra AI có được cấu hình chưa
  useEffect(() => {
    if (!token || configured !== null) return;
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
    }).then((r) => setConfigured(r.status !== 503)).catch(() => setConfigured(false));
  }, [token, configured]);

  // Auto-scroll xuống cuối
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input khi mở
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || !token) return;

    setInput("");
    setError("");
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context: dashboardContext }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, token, dashboardContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Không render nếu chưa auth
  if (!token) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div className="w-[340px] sm:w-[380px] h-[520px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)] bg-indigo-600/10">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">AI Copilot</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {configured === false ? "⚠ Chưa cấu hình API key" : "Giáo viên & Huấn luyện viên"}
              </p>
            </div>
            <button onClick={() => setMessages([])} className="text-[10px] text-[var(--text-subtle)] hover:text-[var(--text-muted)] mr-1">
              Xóa
            </button>
            <button onClick={() => setOpen(false)} className="text-[var(--text-subtle)] hover:text-[var(--text)]">
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot size={32} className="mx-auto mb-3 text-indigo-400 opacity-60" />
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  {configured === false
                    ? "Thêm AI_API_KEY vào .env để kích hoạt AI Copilot"
                    : "Hỏi bất cứ điều gì về ngôn ngữ, ngữ pháp, hoặc tiến trình học của bạn"}
                </p>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="block w-full text-left text-[11px] px-3 py-2 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  m.role === "user" ? "bg-indigo-500 text-white" : "bg-[var(--bg-muted)] text-indigo-400"
                }`}>
                  {m.role === "user" ? "T" : <Sparkles size={10} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white rounded-tr-sm"
                    : "bg-[var(--bg-muted)] text-[var(--text)] rounded-tl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
                  <Sparkles size={10} className="text-indigo-400" />
                </div>
                <div className="bg-[var(--bg-muted)] rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 size={12} className="animate-spin text-indigo-400" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-[11px] text-red-400 text-center px-3">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] p-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi AI (Enter để gửi, Shift+Enter xuống dòng)..."
              disabled={loading || configured === false}
              rows={1}
              className="flex-1 resize-none text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 max-h-24 overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading || configured === false}
              className="p-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {!open && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
            {messages.filter((m) => m.role === "assistant").length}
          </span>
        )}
      </button>
    </div>
  );
}
