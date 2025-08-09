"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const ScheduleBlocksClient = dynamic(() => import("./ScheduleBlocksClient"), {
  ssr: false,
});
const TimelineClient = dynamic(() => import("./TimelineClient"), {
  ssr: false,
});

type Item = { id: string; title: string; start?: string; end?: string };

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [google, setGoogle] = useState<Item[]>([]);
  const [microsoft, setMicrosoft] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar/events?date=${dateISO}`, {
          cache: "no-store",
        });
        if (res.ok) {
          type GoogleAPIEvent = { id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };
          type MicrosoftAPIEvent = { id: string; subject?: string; start?: { dateTime?: string }; end?: { dateTime?: string } };
          const data: { google?: GoogleAPIEvent[]; microsoft?: MicrosoftAPIEvent[]; items?: GoogleAPIEvent[] } = await res.json();
          setGoogle(
            (data.google || data.items || []).map((e: { id: string; summary?: string; subject?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => ({
              id: e.id,
              title: e.summary ?? e.subject ?? "(no title)",
              start: e.start?.dateTime ?? e.start?.date,
              end: e.end?.dateTime ?? e.end?.date,
            }))
          );
          setMicrosoft(
            (data.microsoft || []).map((e: { id: string; subject?: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string } }) => ({
              id: e.id,
              title: e.subject ?? e.summary ?? "(no title)",
              start: e.start?.dateTime,
              end: e.end?.dateTime,
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [dateISO]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Schedule</h1>
      <div className="mt-4 flex items-center gap-2">
        <input
          type="date"
          value={dateISO}
          onChange={(e) => setDateISO(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border p-3">
          <div className="mb-2 font-semibold">Google</div>
          <div className="space-y-2 text-sm">
            {loading && <div className="opacity-70">Loading…</div>}
            {!loading && google.length === 0 && (
              <div className="opacity-70">No events</div>
            )}
            {google.map((e) => (
              <div key={e.id} className="rounded border p-2">
                <div className="font-medium">{e.title}</div>
                <div className="opacity-70">
                  {e.start} — {e.end}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border p-3">
          <div className="mb-2 font-semibold">Microsoft</div>
          <div className="space-y-2 text-sm">
            {loading && <div className="opacity-70">Loading…</div>}
            {!loading && microsoft.length === 0 && (
              <div className="opacity-70">No events</div>
            )}
            {microsoft.map((e) => (
              <div key={e.id} className="rounded border p-2">
                <div className="font-medium">{e.title}</div>
                <div className="opacity-70">
                  {e.start} — {e.end}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Planned blocks</h2>
      <ScheduleBlocksClient dateISO={dateISO} />

      <h2 className="mt-8 text-lg font-semibold">Day timeline</h2>
      <TimelineClient dateISO={dateISO} />
    </div>
  );
}
