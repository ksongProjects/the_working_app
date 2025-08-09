import { getValidAccessToken } from '@/server/oauth/token';

type GoogleEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
};

export async function listGoogleEventsForDay(userId: string, dateISO: string) {
  const accessToken = await getValidAccessToken(userId, 'google');
  if (!accessToken) return [] as GoogleEvent[];
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

export async function listGoogleEventsBetween(userId: string, startISO: string, endISO: string) {
  const accessToken = await getValidAccessToken(userId, 'google');
  if (!accessToken) return [] as GoogleEvent[];
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      startISO
    )}&timeMax=${encodeURIComponent(endISO)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as GoogleEvent[];
}

export async function createGoogleEvent(params: { userId: string; title: string; startISO: string; endISO: string }) {
  const { userId, title, startISO, endISO } = params;
  const accessToken = await getValidAccessToken(userId, 'google');
  if (!accessToken) throw new Error('No Google account linked');
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
  const accessToken = await getValidAccessToken(userId, 'google');
  if (!accessToken) throw new Error('No Google account linked');
  const patch: { summary?: string; start?: { dateTime: string }; end?: { dateTime: string } } = {};
  if (title) patch.summary = title;
  if (startISO) patch.start = { dateTime: startISO };
  if (endISO) patch.end = { dateTime: endISO };
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Google update event failed: ${res.status}`);
  return { ok: true };
}

export async function deleteGoogleEvent(params: { userId: string; eventId: string }) {
  const { userId, eventId } = params;
  const accessToken = await getValidAccessToken(userId, 'google');
  if (!accessToken) throw new Error('No Google account linked');
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}` , {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // Google returns 204 No Content on success. Treat 404 as already-deleted.
  if (!res.ok && res.status !== 404) throw new Error(`Google delete event failed: ${res.status}`);
  return { ok: true };
}


