import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const sourceType = String(url.searchParams.get('sourceType') || 'custom');
  const sourceId = url.searchParams.get('sourceId');

  if (!sourceId) return NextResponse.json({ error: 'missing-sourceId' }, { status: 400 });

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId, sourceType, sourceId, endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { id: true, startedAt: true },
  });

  if (!openEntry) return NextResponse.json({ open: false });
  return NextResponse.json({ open: true, id: openEntry.id, startedAt: openEntry.startedAt });
}


