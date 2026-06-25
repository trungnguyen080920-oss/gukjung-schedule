// Seed dữ liệu mẫu cho PolyGlot Hub — chạy: `npx prisma db seed`
// Idempotent: dùng upsert theo `code`/`email` nên chạy lại nhiều lần không nhân đôi.
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1) Danh mục gốc ----------------------------------------------------------
  const categories = [
    { code: "LANG", name: "Ngôn ngữ", description: "Các ngôn ngữ: Anh, Trung, Nhật, Pháp..." },
    { code: "TECH", name: "Công nghệ", description: "Lập trình, MCP, hệ thống..." },
    { code: "SCI", name: "Khoa học tự nhiên", description: "Toán, Lý, Hóa..." },
  ];
  for (const c of categories) {
    await prisma.subjectCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }
  const lang = await prisma.subjectCategory.findUniqueOrThrow({ where: { code: "LANG" } });
  const tech = await prisma.subjectCategory.findUniqueOrThrow({ where: { code: "TECH" } });

  // 2) Môn học mẫu (màu khớp Prompt 3 Heatmap) --------------------------------
  const subjects = [
    { code: "TOEIC", name: "TOEIC (Tiếng Anh)", categoryId: lang.id, colorHex: "#3B82F6" }, // xanh dương
    { code: "BCT", name: "BCT (Hoa ngữ thương mại)", categoryId: lang.id, colorHex: "#EC4899" }, // hồng
    { code: "HSK", name: "HSK (Tiếng Trung)", categoryId: lang.id, colorHex: "#A855F7" }, // tím
    { code: "JP_N3", name: "Tiếng Nhật N3", categoryId: lang.id, colorHex: "#EF4444" }, // đỏ
    { code: "REACT", name: "Lập trình React", categoryId: tech.id, colorHex: "#06B6D4" }, // cyan
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, categoryId: s.categoryId, colorHex: s.colorHex },
      create: s,
    });
  }

  // 3) User ADMIN mẫu — password: "admin123" (đổi sau khi test) ---------------
  const passwordHash = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@polyglot.local" },
    update: { role: "ADMIN", name: "Admin PolyGlot", passwordHash },
    create: {
      email: "admin@polyglot.local",
      name: "Admin PolyGlot",
      role: "ADMIN",
      passwordHash,
    },
  });

  const [cCat, cSub, cUser] = await Promise.all([
    prisma.subjectCategory.count(),
    prisma.subject.count(),
    prisma.user.count(),
  ]);
  console.log(`Seed xong: ${cCat} danh mục, ${cSub} môn học, ${cUser} user.`);
  console.log("Admin login: email=admin@polyglot.local, password=admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
