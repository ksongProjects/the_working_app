import { prisma } from '@/lib/prisma';
import { getValidAccessToken } from '@/server/oauth/token';

type MsEvent = {
  id: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
};

export async function listOutlookEventsForDay(userId: string, dateISO: string) {
  const accessToken = await getValidAccessToken(userId, 'microsoft');
  if (!accessToken) return [] as MsEvent[];
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

export async function createOutlookEvent(params: { userId: string; title: string; startISO: string; endISO: string }) {
  const { userId, title, startISO, endISO } = params;
  const accessToken = await getValidAccessToken(userId, 'microsoft');
  if (!accessToken) throw new Error('No Microsoft account linked');
  const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: title,
      start: { dateTime: startISO, timeZone: 'UTC' },
      end: { dateTime: endISO, timeZone: 'UTC' },
    }),
  });
  if (!res.ok) throw new Error(`Outlook create event failed: ${res.status}`);
  const data = await res.json();
  return { id: data.id as string };
}

export async function updateOutlookEvent(params: { userId: string; eventId: string; title?: string; startISO?: string; endISO?: string }) {
  const { userId, eventId, title, startISO, endISO } = params;
  const accessToken = await getValidAccessToken(userId, 'microsoft');
  if (!accessToken) throw new Error('No Microsoft account linked');
  const patch: any = {};
  if (title) patch.subject = title;
  if (startISO) patch.start = { dateTime: startISO, timeZone: 'UTC' };
  if (endISO) patch.end = { dateTime: endISO, timeZone: 'UTC' };
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Outlook update event failed: ${res.status}`);
  return { ok: true };
}

export async function deleteOutlookEvent(params: { userId: string; eventId: string }) {
  const { userId, eventId } = params;
  const accessToken = await getValidAccessToken(userId, 'microsoft');
  if (!accessToken) throw new Error('No Microsoft account linked');
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // Graph returns 204 on success. Treat 404 as already-deleted.
  if (!res.ok && res.status !== 404) throw new Error(`Outlook delete event failed: ${res.status}`);
  return { ok: true };
}


