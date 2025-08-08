import { prisma } from '@/lib/prisma';

type MsEvent = {
  id: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
};

export async function listOutlookEventsForDay(userId: string, dateISO: string) {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: 'microsoft' } },
    select: { accessToken: true },
  });
  if (!account?.accessToken) return [] as MsEvent[];
  const accessToken = account.accessToken;
  const start = new Date(dateISO + 'T00:00:00Z').toISOString();
  const end = new Date(dateISO + 'T23:59:59Z').toISOString();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.value ?? []) as MsEvent[];
}


