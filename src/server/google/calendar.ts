import { prisma } from '@/lib/prisma';

type GoogleEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
};

export async function listGoogleEventsForDay(userId: string, dateISO: string) {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
    select: { accessToken: true },
  });
  if (!account?.accessToken) return [] as GoogleEvent[];
  const accessToken = account.accessToken;
  const timeMin = new Date(dateISO + 'T00:00:00Z').toISOString();
  const timeMax = new Date(dateISO + 'T23:59:59Z').toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as GoogleEvent[];
}

export async function createGoogleEvent(params: { userId: string; title: string; startISO: string; endISO: string }) {
  const { userId, title, startISO, endISO } = params;
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
    select: { accessToken: true },
  });
  if (!account?.accessToken) throw new Error('No Google account linked');
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: title,
      start: { dateTime: startISO },
      end: { dateTime: endISO },
    }),
  });
  if (!res.ok) throw new Error(`Google create event failed: ${res.status}`);
  const data = await res.json();
  return { id: data.id as string };
}

export async function updateGoogleEvent(params: { userId: string; eventId: string; title?: string; startISO?: string; endISO?: string }) {
  const { userId, eventId, title, startISO, endISO } = params;
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
    select: { accessToken: true },
  });
  if (!account?.accessToken) throw new Error('No Google account linked');
  const patch: any = {};
  if (title) patch.summary = title;
  if (startISO) patch.start = { dateTime: startISO };
  if (endISO) patch.end = { dateTime: endISO };
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Google update event failed: ${res.status}`);
  return { ok: true };
}


