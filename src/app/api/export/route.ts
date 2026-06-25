// GET /api/export?format=csv|json
// Auth: JWT
// Export toàn bộ tiến độ học tập ra file CSV hoặc JSON
import { verifyJwt, extractBearer } from "@/lib/auth";
import { getDashboardSummary } from "@/modules/progress/application/get-dashboard-summary.usecase";

export async function GET(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let claims;
  try { claims = await verifyJwt(raw); }
  catch { return Response.json({ error: "JWT không hợp lệ" }, { status: 401 }); }

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  const data = await getDashboardSummary(claims.userId);

  if (format === "json") {
    const blob = JSON.stringify(data, null, 2);
    return new Response(blob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gukjung_progress_${today()}.json"`,
      },
    });
  }

  // CSV format
  const rows: string[] = [
    "Môn học,Danh mục,Mã môn,Tổng note,Tổng thẻ,Thẻ đã thuộc,Thời gian học (phút),Streak hiện tại,Streak dài nhất,Lần học gần nhất,Hoàn thành (%)",
  ];
  for (const { subject, progress } of data.subjects) {
    rows.push([
      `"${subject.name}"`,
      `"${subject.category.name}"`,
      subject.code,
      progress.totalNotes,
      progress.totalCards,
      progress.masteredCards,
      Math.round(progress.totalStudySec / 60),
      progress.currentStreak,
      progress.longestStreak,
      progress.lastStudiedAt ? new Date(progress.lastStudiedAt).toLocaleDateString("vi-VN") : "—",
      progress.completionPct,
    ].join(","));
  }

  const csv = "﻿" + rows.join("\r\n"); // BOM cho Excel mở UTF-8 đúng
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gukjung_progress_${today()}.csv"`,
    },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
