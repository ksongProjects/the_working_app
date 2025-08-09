import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function GET() {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
    select: { provider: true, expiresAt: true, scopes: true, accountId: true },
    orderBy: { provider: 'asc' },
  });
  return NextResponse.json({ accounts });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({} as unknown));
  const provider = (body?.provider || '').toString() as 'google' | 'microsoft' | 'atlassian';
  if (!provider) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    await prisma.connectedAccount.delete({ where: { userId_provider: { userId, provider } } });
  } catch {
    // ignore if not found
  }
  return NextResponse.json({ ok: true });
}


