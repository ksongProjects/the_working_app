import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const sourceType = url.searchParams.get('sourceType') || undefined;
  const sourceId = url.searchParams.get('sourceId') || undefined;
  const totalsOnly = url.searchParams.get('totals') === '1' || url.searchParams.get('totals') === 'true';

  if (totalsOnly) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    const entries = await prisma.timeEntry.findMany({
      where: { userId, startedAt: { gte: start, lte: end } },
      select: { startedAt: true, endedAt: true },
    });
    let ms = 0;
    const now = new Date();
    for (const e of entries) {
      ms += Math.max(0, (e.endedAt ?? now).getTime() - e.startedAt.getTime());
    }
    const minutes = Math.round(ms / 60000);
    return NextResponse.json({ minutes });
  }

  if (!sourceId) return NextResponse.json({ error: 'missing-sourceId' }, { status: 400 });

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId, sourceType: sourceType || undefined, sourceId, endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { id: true, startedAt: true },
  });

  if (!openEntry) return NextResponse.json({ open: false });
  return NextResponse.json({ open: true, id: openEntry.id, startedAt: openEntry.startedAt });
}


