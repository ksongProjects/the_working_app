import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { listGoogleEventsForDay } from '@/server/google/calendar';
import { listOutlookEventsForDay } from '@/server/microsoft/calendar';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const provider = searchParams.get('provider');

  if (provider === 'google') {
    const items = await listGoogleEventsForDay(session.user.id, date);
    return NextResponse.json({ items });
  }
  if (provider === 'microsoft') {
    const items = await listOutlookEventsForDay(session.user.id, date);
    return NextResponse.json({ items });
  }
  // both
  const [g, m] = await Promise.all([
    listGoogleEventsForDay(session.user.id, date).catch(() => []),
    listOutlookEventsForDay(session.user.id, date).catch(() => []),
  ]);
  return NextResponse.json({ google: g, microsoft: m });
}


