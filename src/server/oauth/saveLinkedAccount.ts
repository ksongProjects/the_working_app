import { prisma } from '@/lib/prisma';

export async function upsertLinkedAccount(params: {
  userId: string;
  provider: 'atlassian' | 'google' | 'microsoft';
  accountId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string | null;
}) {
  const { userId, provider, accountId, accessToken, refreshToken, expiresAt, scopes } = params;
  return prisma.connectedAccount.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      accountId,
      accessToken,
      refreshToken: refreshToken ?? undefined,
      expiresAt: expiresAt ?? undefined,
      scopes: scopes ?? undefined,
    },
    update: {
      accountId,
      accessToken,
      refreshToken: refreshToken ?? undefined,
      expiresAt: expiresAt ?? undefined,
      scopes: scopes ?? undefined,
    },
  });
}


