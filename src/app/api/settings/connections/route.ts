import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({} as any));
  const provider = (body?.provider || '').toString() as 'google' | 'microsoft' | 'atlassian';
  if (!provider) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    await prisma.connectedAccount.delete({ where: { userId_provider: { userId: session.user.id, provider } } });
  } catch {
    // ignore if not found
  }
  return NextResponse.json({ ok: true });
}


