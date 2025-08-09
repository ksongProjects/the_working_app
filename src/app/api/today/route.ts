import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const dateISO = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const entries = await prisma.todayEntry.findMany({ where: { userId, dateISO }, orderBy: { start: 'asc' } });
  return NextResponse.json({ items: entries });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json();
  const action = body?.action as 'upsert' | 'remove';
  if (action === 'upsert') {
    const { dateISO, kind, provider, sourceId, title, start, end } = body as { dateISO: string; kind: 'calendar' | 'schedule' | 'jira'; provider?: string | null; sourceId: string; title: string; start?: string | null; end?: string | null };
    const row = await prisma.todayEntry.upsert({
      where: { userId_dateISO_kind_sourceId: { userId, dateISO, kind, sourceId } },
      update: { title, start: start ? new Date(start) : null, end: end ? new Date(end) : null, provider: provider || null },
      create: { userId, dateISO, kind, sourceId, provider: provider || null, title, start: start ? new Date(start) : null, end: end ? new Date(end) : null },
    });
    return NextResponse.json(row);
  }
  if (action === 'remove') {
    const { dateISO, kind, sourceId } = body as { dateISO: string; kind: 'calendar' | 'schedule' | 'jira'; sourceId: string };
    await prisma.todayEntry.delete({ where: { userId_dateISO_kind_sourceId: { userId, dateISO, kind, sourceId } } }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'bad_request' }, { status: 400 });
}


