import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { listGoogleEventsForDay, listGoogleEventsBetween, updateGoogleEvent, deleteGoogleEvent, createGoogleEvent } from '@/server/google/calendar';
import { listOutlookEventsForDay, listOutlookEventsBetween, updateOutlookEvent, deleteOutlookEvent, createOutlookEvent } from '@/server/microsoft/calendar';
import { prisma } from '@/lib/prisma';
import { classifyText } from '@/server/classifier';

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const provider = searchParams.get('provider');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const useSettingsRange = searchParams.get('useSettingsRange') === '1' || searchParams.get('useSettingsRange') === 'true';

  async function getRangeFromSettings(p?: string): Promise<{ startISO?: string; endISO?: string }> {
    if (!useSettingsRange) return {};
    const s = await prisma.settings.findUnique({ where: { userId } });
    const now = new Date();
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth(); // 0-11
    function firstDayOfMonthUTC(y: number, mZeroBased: number) {
      return new Date(Date.UTC(y, mZeroBased, 1, 0, 0, 0));
    }
    function lastDayOfMonthUTC(y: number, mZeroBased: number) {
      // day 0 of next month is last day of this month
      return new Date(Date.UTC(y, mZeroBased + 1, 0, 23, 59, 59));
    }
    if (!p || p === 'google') {
      const before = s?.googleMonthsBefore ?? 0;
      const after = s?.googleMonthsAfter ?? 0;
      const startMonthIndex = monthIndex - before;
      const endMonthIndex = monthIndex + after;
      const startDate = firstDayOfMonthUTC(year + Math.floor(startMonthIndex / 12), ((startMonthIndex % 12) + 12) % 12);
      const endDate = lastDayOfMonthUTC(year + Math.floor(endMonthIndex / 12), ((endMonthIndex % 12) + 12) % 12);
      return { startISO: startDate.toISOString(), endISO: endDate.toISOString() };
    }
    if (p === 'microsoft') {
      const before = s?.microsoftMonthsBefore ?? 0;
      const after = s?.microsoftMonthsAfter ?? 0;
      const startMonthIndex = monthIndex - before;
      const endMonthIndex = monthIndex + after;
      const startDate = firstDayOfMonthUTC(year + Math.floor(startMonthIndex / 12), ((startMonthIndex % 12) + 12) % 12);
      const endDate = lastDayOfMonthUTC(year + Math.floor(endMonthIndex / 12), ((endMonthIndex % 12) + 12) % 12);
      return { startISO: startDate.toISOString(), endISO: endDate.toISOString() };
    }
    return {};
  }

  if (provider === 'google') {
    const range = await getRangeFromSettings('google');
    const sISO = start || range.startISO;
    const eISO = end || range.endISO;
    if (sISO && eISO) {
      const items = await listGoogleEventsBetween(userId, sISO, eISO);
      return NextResponse.json({ items });
    }
    const items = await listGoogleEventsForDay(userId, date);
    return NextResponse.json({ items });
  }
  if (provider === 'microsoft') {
    const range = await getRangeFromSettings('microsoft');
    const sISO = start || range.startISO;
    const eISO = end || range.endISO;
    if (sISO && eISO) {
      const items = await listOutlookEventsBetween(userId, sISO, eISO);
      return NextResponse.json({ items });
    }
    const items = await listOutlookEventsForDay(userId, date);
    return NextResponse.json({ items });
  }
  // both
  const gRange = await getRangeFromSettings('google');
  const mRange = await getRangeFromSettings('microsoft');
  const [g, m] = await Promise.all([
    ((start && end) || gRange.startISO
      ? listGoogleEventsBetween(userId, start || gRange.startISO!, end || gRange.endISO!)
      : listGoogleEventsForDay(userId, date)
    ).catch(() => []),
    ((start && end) || mRange.startISO
      ? listOutlookEventsBetween(userId, start || mRange.startISO!, end || mRange.endISO!)
      : listOutlookEventsForDay(userId, date)
    ).catch(() => []),
  ]);
  return NextResponse.json({ google: g, microsoft: m });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const provider = body?.provider as 'google' | 'microsoft' | undefined;
  const title = body?.title as string | undefined;
  const start = body?.start as string | undefined;
  const end = body?.end as string | undefined;
  if (!provider || !title || !start || !end) return NextResponse.json({ error: 'missing params' }, { status: 400 });
  try {
    if (provider === 'google') {
      const res = await createGoogleEvent({ userId, title, startISO: start, endISO: end });
      // If the event is for today, reflect into TodayEntry
      const day = start.slice(0, 10);
      const todayISO = new Date().toISOString().slice(0, 10);
      if (day === todayISO) {
        const cls = await classifyText(title);
        await prisma.todayEntry.upsert({
          where: { userId_dateISO_kind_sourceId: { userId, dateISO: todayISO, kind: 'calendar', sourceId: res.id } },
          update: { title, start: new Date(start), end: new Date(end), provider: 'google' },
          create: { userId, dateISO: todayISO, kind: 'calendar', sourceId: res.id, title, start: new Date(start), end: new Date(end), provider: 'google' },
        });
        // Store category if schema supports it
        try {
          await prisma.todayEntry.update({ where: { userId_dateISO_kind_sourceId: { userId, dateISO: todayISO, kind: 'calendar', sourceId: res.id } }, data: { /* @ts-ignore */ category: cls.label } });
        } catch {}
      }
      return NextResponse.json({ id: res.id });
    } else {
      const res = await createOutlookEvent({ userId, title, startISO: start, endISO: end });
      const day = start.slice(0, 10);
      const todayISO = new Date().toISOString().slice(0, 10);
      if (day === todayISO) {
        const cls = await classifyText(title);
        await prisma.todayEntry.upsert({
          where: { userId_dateISO_kind_sourceId: { userId, dateISO: todayISO, kind: 'calendar', sourceId: res.id } },
          update: { title, start: new Date(start), end: new Date(end), provider: 'microsoft' },
          create: { userId, dateISO: todayISO, kind: 'calendar', sourceId: res.id, title, start: new Date(start), end: new Date(end), provider: 'microsoft' },
        });
        try {
          await prisma.todayEntry.update({ where: { userId_dateISO_kind_sourceId: { userId, dateISO: todayISO, kind: 'calendar', sourceId: res.id } }, data: { /* @ts-ignore */ category: cls.label } });
        } catch {}
      }
      return NextResponse.json({ id: res.id });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const provider = body?.provider as 'google' | 'microsoft' | undefined;
  const id = body?.id as string | undefined;
  const title = body?.title as string | undefined;
  const start = body?.start as string | undefined;
  const end = body?.end as string | undefined;
  if (!provider || !id) return NextResponse.json({ error: 'missing params' }, { status: 400 });
  try {
    if (provider === 'google') {
      await updateGoogleEvent({ userId, eventId: id, title, startISO: start, endISO: end });
      const todayISO = new Date().toISOString().slice(0, 10);
      const day = (start || '').slice(0, 10) || todayISO;
      const cls = title ? await classifyText(title) : null;
      await prisma.todayEntry.upsert({
        where: { userId_dateISO_kind_sourceId: { userId, dateISO: day, kind: 'calendar', sourceId: id } },
        update: { title: title || undefined, start: start ? new Date(start) : undefined, end: end ? new Date(end) : undefined, provider: 'google' },
        create: { userId, dateISO: day, kind: 'calendar', sourceId: id, title: title || '(no title)', start: start ? new Date(start) : null, end: end ? new Date(end) : null, provider: 'google' },
      });
      if (cls) {
        try { await prisma.todayEntry.update({ where: { userId_dateISO_kind_sourceId: { userId, dateISO: day, kind: 'calendar', sourceId: id } }, data: { /* @ts-ignore */ category: cls.label } }); } catch {}
      }
    } else {
      await updateOutlookEvent({ userId, eventId: id, title, startISO: start, endISO: end });
      const todayISO = new Date().toISOString().slice(0, 10);
      const day = (start || '').slice(0, 10) || todayISO;
      const cls = title ? await classifyText(title) : null;
      await prisma.todayEntry.upsert({
        where: { userId_dateISO_kind_sourceId: { userId, dateISO: day, kind: 'calendar', sourceId: id } },
        update: { title: title || undefined, start: start ? new Date(start) : undefined, end: end ? new Date(end) : undefined, provider: 'microsoft' },
        create: { userId, dateISO: day, kind: 'calendar', sourceId: id, title: title || '(no title)', start: start ? new Date(start) : null, end: end ? new Date(end) : null, provider: 'microsoft' },
      });
      if (cls) {
        try { await prisma.todayEntry.update({ where: { userId_dateISO_kind_sourceId: { userId, dateISO: day, kind: 'calendar', sourceId: id } }, data: { /* @ts-ignore */ category: cls.label } }); } catch {}
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const provider = body?.provider as 'google' | 'microsoft' | undefined;
  const id = body?.id as string | undefined;
  if (!provider || !id) return NextResponse.json({ error: 'missing params' }, { status: 400 });
  try {
    if (provider === 'google') {
      await deleteGoogleEvent({ userId, eventId: id });
    } else {
      await deleteOutlookEvent({ userId, eventId: id });
    }
    const todayISO = new Date().toISOString().slice(0, 10);
    await prisma.todayEntry.delete({ where: { userId_dateISO_kind_sourceId: { userId, dateISO: todayISO, kind: 'calendar', sourceId: id } } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}


