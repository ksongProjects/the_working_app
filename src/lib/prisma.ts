import { PrismaClient } from '@/generated/prisma';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const prismaClient = global.prismaGlobal ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prismaGlobal = prismaClient;

export const prisma = prismaClient;


