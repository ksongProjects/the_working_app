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


