import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth/config';
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '@/server/google/calendar';
import { createOutlookEvent, updateOutlookEvent, deleteOutlookEvent } from '@/server/microsoft/calendar';

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const start = new Date(date + 'T00:00:00.000Z');
  const end = new Date(date + 'T23:59:59.999Z');
  const items = await prisma.scheduleBlock.findMany({
    where: { userId, start: { lte: end }, end: { gte: start } },
    orderBy: { start: 'asc' },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json();
  const action = body?.action as 'create' | 'update' | 'delete' | undefined;
  if (!action) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  if (action === 'create') {
    const { title, start, end, sourceType, sourceId, mirrorTo } = body as {
      title: string; start: string; end: string; sourceType?: string; sourceId?: string | null; mirrorTo?: 'google' | 'microsoft' | null;
    };
    const row = await prisma.scheduleBlock.create({
      data: { userId, title, start: new Date(start), end: new Date(end), sourceType: sourceType || 'custom', sourceId: sourceId || undefined },
    });
    if (mirrorTo === 'google') {
      try {
        const created = await createGoogleEvent({ userId, title, startISO: start, endISO: end });
        await prisma.scheduleBlock.update({ where: { id: row.id }, data: { provider: 'google', providerEventId: created.id } });
      } catch {}
    }
    if (mirrorTo === 'microsoft') {
      try {
        const created = await createOutlookEvent({ userId, title, startISO: start, endISO: end });
        await prisma.scheduleBlock.update({ where: { id: row.id }, data: { provider: 'microsoft', providerEventId: created.id } });
      } catch {}
    }
    return NextResponse.json(row);
  }
  if (action === 'update') {
    const { id, title, start, end } = body as { id: string; title?: string; start?: string; end?: string };
    const row = await prisma.scheduleBlock.update({
      where: { id },
      data: { title, start: start ? new Date(start) : undefined, end: end ? new Date(end) : undefined },
    });
    if (row.provider === 'google' && row.providerEventId) {
      try {
        await updateGoogleEvent({ userId, eventId: row.providerEventId, title: title, startISO: start, endISO: end });
      } catch {}
    }
    if (row.provider === 'microsoft' && row.providerEventId) {
      try {
        await updateOutlookEvent({ userId, eventId: row.providerEventId, title: title, startISO: start, endISO: end });
      } catch {}
    }
    return NextResponse.json(row);
  }
  if (action === 'delete') {
    const { id } = body as { id: string };
    // Fetch the row to know if it was mirrored
    const row = await prisma.scheduleBlock.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ ok: true });
    // Best-effort delete on provider if mirrored
    try {
      if (row.provider === 'google' && row.providerEventId) {
        await deleteGoogleEvent({ userId, eventId: row.providerEventId });
      }
      if (row.provider === 'microsoft' && row.providerEventId) {
        await deleteOutlookEvent({ userId, eventId: row.providerEventId });
      }
    } catch {}
    await prisma.scheduleBlock.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'unsupported_action' }, { status: 400 });
}


