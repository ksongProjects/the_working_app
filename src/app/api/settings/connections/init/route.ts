import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { listGoogleEventsForDay } from '@/server/google/calendar';
import { listOutlookEventsForDay } from '@/server/microsoft/calendar';
import { getAtlassianClient } from '@/server/atlassian/client';

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const provider = (searchParams.get('provider') || '').toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (provider === 'google') {
      await listGoogleEventsForDay(userId, today).catch(() => []);
      return NextResponse.json({ ok: true, message: 'Fetched Google calendar for today' });
    }
    if (provider === 'microsoft') {
      await listOutlookEventsForDay(userId, today).catch(() => []);
      return NextResponse.json({ ok: true, message: 'Fetched Outlook calendar for today' });
    }
    if (provider === 'atlassian') {
      // simple capability check
      await getAtlassianClient(userId);
      return NextResponse.json({ ok: true, message: 'Jira account connected' });
    }
    return NextResponse.json({ ok: true, message: 'No init for provider' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



