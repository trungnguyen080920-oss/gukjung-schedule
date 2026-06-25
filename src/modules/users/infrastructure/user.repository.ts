import { prisma } from "@/lib/prisma";

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  findByApiToken: (apiToken: string) =>
    prisma.user.findUnique({ where: { apiToken } }),

  updateApiToken: (userId: string, apiToken: string | null) =>
    prisma.user.update({ where: { id: userId }, data: { apiToken } }),
};
