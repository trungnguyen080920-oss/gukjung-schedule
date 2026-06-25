// POST /api/ai/chat — Proxy an toàn đến Doubao AI (OpenAI-compatible API)
// API key giữ ở server, không lộ ra client
import { verifyJwt, extractBearer } from "@/lib/auth";

interface Message { role: "system" | "user" | "assistant"; content: string }

export async function POST(request: Request) {
  // Auth JWT — chỉ user đã đăng nhập mới dùng được AI
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { await verifyJwt(raw); } catch { return Response.json({ error: "JWT không hợp lệ" }, { status: 401 }); }

  const body = await request.json().catch(() => null) as {
    messages: Message[];
    context?: {
      subjects?: { name: string; streak: number; totalCards: number; completionPct: number }[];
      todayStudySec?: number;
      // Health context
      todayWorkout?: string | null;
      waterMl?: number;
      calIn?: number;
      calBurned?: number;
    };
  } | null;

  if (!body?.messages?.length) return Response.json({ error: "Thiếu messages" }, { status: 400 });

  const apiKey  = process.env.AI_API_KEY;
  const apiBase = process.env.AI_API_BASE ?? "https://ark.volcengine.com/api/v3";
  const model   = process.env.AI_MODEL ?? "doubao-pro-32k-241215";

  if (!apiKey) {
    return Response.json({ error: "AI_API_KEY chưa được cấu hình trong .env" }, { status: 503 });
  }

  // Xây dựng system prompt dựa trên context dashboard
  const ctxParts: string[] = [];
  if (body.context?.subjects?.length) {
    const subjectList = body.context.subjects
      .map((s) => `• ${s.name}: ${s.totalCards} thẻ (${s.completionPct}% hoàn thành, streak ${s.streak} ngày)`)
      .join("\n");
    ctxParts.push(`## Tiến trình học tập hôm nay:\n${subjectList}`);
  }
  if (body.context?.todayStudySec) {
    ctxParts.push(`Thời gian học hôm nay: ${Math.round(body.context.todayStudySec / 60)} phút`);
  }
  // Health context
  if (body.context?.todayWorkout) {
    ctxParts.push(`Bài tập hôm nay: **${body.context.todayWorkout}**`);
  }
  if (body.context?.waterMl !== undefined) {
    ctxParts.push(`Nước đã uống: ${(body.context.waterMl / 1000).toFixed(1)}L / 2.5L mục tiêu`);
  }
  if (body.context?.calIn !== undefined) {
    const net = (body.context.calIn ?? 0) - (body.context.calBurned ?? 0);
    ctxParts.push(`Calories: nạp ${body.context.calIn}kcal, tiêu hao ${body.context.calBurned ?? 0}kcal, net ${net}kcal`);
  }

  const systemPrompt = `Bạn là trợ lý AI đa năng của GUKJUNG Schedule — nền tảng học tập ngôn ngữ và quản lý sức khoẻ toàn diện.

**Vai trò:**
1. 🎓 Giáo viên ngôn ngữ: Giải thích ngữ pháp TOEIC/BCT/HSK/JLPT, sửa lỗi văn phong, dịch và phân tích từ vựng theo bối cảnh công sở.
2. 📊 Huấn luyện viên học tập: Phân tích tiến trình, đề xuất lịch ôn tập, tạo câu hỏi ôn luyện.
3. 💪 Huấn luyện viên sức khoẻ: Đọc dữ liệu tập luyện và dinh dưỡng hôm nay, tư vấn thực đơn phù hợp với bài tập (VD: Leg day → cần nhiều protein + tinh bột phức hợp).
4. 🌅 Lập kế hoạch ngày: Nhắc nhở lịch học, gợi ý thứ tự ưu tiên task, đánh giá cuối ngày.

**Phong cách:** Ngắn gọn, thực tế, cá nhân hóa theo dữ liệu. Tiếng Việt là ngôn ngữ chính. Khi tư vấn dinh dưỡng: đưa ra con số cụ thể (protein g, calo kcal). Khi tư vấn học tập: tạo ví dụ câu thực tế.

${ctxParts.length ? `---\n${ctxParts.join("\n")}\n---` : ""}`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...body.messages.slice(-20), // giữ 20 turns gần nhất để tiết kiệm tokens
  ];

  try {
    const res = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7, stream: false }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `AI API lỗi: ${res.status} — ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    const usage  = data.usage ?? {};
    return Response.json({ reply, usage });
  } catch (e) {
    return Response.json({ error: `Không kết nối được AI API: ${(e as Error).message}` }, { status: 503 });
  }
}
