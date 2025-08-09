import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { prisma } from '@/lib/prisma';

type Seg = { start: Date; end: Date };
function merge(segs: Seg[]): Seg[] {
  const s = segs.slice().sort((a,b) => +a.start - +b.start);
  const out: Seg[] = [];
  for (const cur of s) {
    if (!out.length || cur.start > out[out.length-1].end) out.push({ ...cur });
    else out[out.length-1].end = new Date(Math.max(+out[out.length-1].end, +cur.end));
  }
  return out;
}
function msSum(segs: Seg[]) { return segs.reduce((m, x) => m + Math.max(0, +x.end - +x.start), 0); }
function intersectMs(a: Seg[], b: Seg[]): number {
  let i=0,j=0,ms=0;
  while (i<a.length && j<b.length) {
    const s = new Date(Math.max(+a[i].start, +b[j].start));
    const e = new Date(Math.min(+a[i].end, +b[j].end));
    if (e > s) ms += (+e - +s);
    if (a[i].end < b[j].end) i++; else j++;
  }
  return ms;
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const dateISO = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  // Check cache
  const existing = await prisma.dailyStats.findUnique({ where: { userId_dateISO: { userId, dateISO } } });
  if (existing) return NextResponse.json(existing);

  const dayStartUTC = new Date(dateISO + 'T00:00:00Z');
  const dayEndUTC = new Date(dateISO + 'T23:59:59Z');

  // Busy from TimeEntries
  const entries = await prisma.timeEntry.findMany({ where: { userId, startedAt: { lte: dayEndUTC }, OR: [{ endedAt: null }, { endedAt: { gte: dayStartUTC } }] } });
  const busy = merge(entries.map(e => ({ start: e.startedAt, end: e.endedAt ?? new Date() })));
  const workMs = msSum(busy);
  const dayStart = busy[0]?.start ?? null;
  const dayEnd = busy[busy.length-1]?.end ?? null;

  // Meetings from TodayEntry
  const meetings = await prisma.todayEntry.findMany({ where: { userId, dateISO, kind: 'calendar' } });
  const meetingSegs = merge(meetings.filter(m => m.start && m.end).map(m => ({ start: m.start as Date, end: m.end as Date })));
  const meetingMs = intersectMs(busy, meetingSegs);

  // Breaks: gaps between busy segments ≥ 10 min
  let breakMs = 0;
  for (let i=1; i<busy.length; i++) {
    const gap = +busy[i].start - +busy[i-1].end;
    if (gap >= 10*60*1000) breakMs += gap;
  }
  const focusMs = Math.max(0, workMs - meetingMs);

  const saved = await prisma.dailyStats.upsert({
    where: { userId_dateISO: { userId, dateISO } },
    update: { dayStart, dayEnd, workMs, breakMs, meetingMs, focusMs },
    create: { userId, dateISO, dayStart, dayEnd, workMs, breakMs, meetingMs, focusMs },
  });
  return NextResponse.json(saved);
}


