import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { prisma } from '@/lib/prisma';
import { listGoogleEventsForDay, listGoogleEventsBetween } from '@/server/google/calendar';
import { listOutlookEventsForDay, listOutlookEventsBetween } from '@/server/microsoft/calendar';

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


