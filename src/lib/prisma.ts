import { PrismaClient } from '@/generated/prisma';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prismaClient = global.prismaGlobal ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prismaGlobal = prismaClient;

export const prisma = prismaClient;


