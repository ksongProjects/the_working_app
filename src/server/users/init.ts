import { prisma } from '@/lib/prisma';

export async function ensureUserDefaults(userId: string) {
  // Create a Settings row if it doesn't exist
  await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}


