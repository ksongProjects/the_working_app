"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

type Provider = "google" | "microsoft";
type GridEvent = {
  id: string;
  title: string;
  provider: Provider;
  start?: string;
  end?: string;
};

export default function CalendarMonthGrid() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth()); // 0-based
  const [events, setEvents] = useState<Record<string, GridEvent[]>>({});
  const [defaultProvider, setDefaultProvider] = useState<Provider>("google");

  const firstDay = useMemo(
    () => new Date(Date.UTC(year, month, 1)),
    [year, month]
  );
  const firstWeekday = firstDay.getUTCDay(); // 0-Sun
  const daysInMonth = useMemo(
    () => new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    [year, month]
  );
  const cells = useMemo(() => {
    const arr: string[] = [];
    // fill leading empty days
    for (let i = 0; i < firstWeekday; i++) arr.push("");
    // month days as ISO
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10);
      arr.push(iso);
    }
    // trail to full weeks (42 cells)
    while (arr.length % 7 !== 0) arr.push("");
    return arr;
  }, [firstWeekday, daysInMonth, year, month]);

  useEffect(() => {
    (async () => {
      // fetch range for visible month
      const startISO = new Date(
        Date.UTC(year, month, 1, 0, 0, 0)
      ).toISOString();
      const endISO = new Date(
        Date.UTC(year, month + 1, 0, 23, 59, 59)
      ).toISOString();
      const url = new URL("/api/calendar/events", window.location.origin);
      url.searchParams.set("start", startISO);
      url.searchParams.set("end", endISO);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const by: Record<string, GridEvent[]> = {};
        const addGoogle = (e: any) => {
          const dt = e.start?.dateTime ?? e.start?.date;
          if (!dt) return;
          const day = dt.slice(0, 10);
          if (!by[day]) by[day] = [];
          by[day].push({
            id: e.id,
            title: e.summary ?? e.subject ?? "(no title)",
            provider: "google",
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
          });
        };
        const addMs = (e: any) => {
          const dt = e.start?.dateTime ?? e.start?.date;
          if (!dt) return;
          const day = dt.slice(0, 10);
          if (!by[day]) by[day] = [];
          by[day].push({
            id: e.id,
            title: e.subject ?? e.summary ?? "(no title)",
            provider: "microsoft",
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
          });
        };
        (data.google || data.items || []).forEach(addGoogle);
        (data.microsoft || []).forEach(addMs);
        setEvents(by);
      }
    })();
  }, [year, month]);

  async function createEvent(dayISO: string) {
    const title = prompt("Event title?");
    if (!title) return;
    const startISO = dayISO + "T09:00:00Z";
    const endISO = dayISO + "T10:00:00Z";
    const provider: Provider = defaultProvider;
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, title, start: startISO, end: endISO }),
    });
    if (res.ok) {
      setEvents((prev) => {
        const next = { ...prev };
        if (!next[dayISO]) next[dayISO] = [];
        next[dayISO].push({
          id: Math.random().toString(36).slice(2),
          title,
          provider,
          start: startISO,
          end: endISO,
        });
        return next;
      });
    }
  }

  function getTimeParts(iso?: string): { hh: number; mm: number } | null {
    if (!iso || iso.length < 16 || !iso.includes("T")) return null;
    const m = /T(\d{2}):(\d{2})/.exec(iso);
    if (!m) return null;
    return { hh: Number(m[1]), mm: Number(m[2]) };
  }
  function getDurationMinutes(start?: string, end?: string) {
    try {
      if (!start || !end) return 60;
      const s = new Date(start);
      const e = new Date(end);
      const ms = Math.max(0, e.getTime() - s.getTime());
      return Math.max(15, Math.round(ms / 60000));
    } catch {
      return 60;
    }
  }

  async function moveEventToDay(ev: GridEvent, dayISO: string) {
    const time = getTimeParts(ev.start) || { hh: 9, mm: 0 };
    const dur = getDurationMinutes(ev.start, ev.end);
    const startISO = new Date(`${dayISO}T00:00:00Z`);
    startISO.setUTCHours(time.hh, time.mm, 0, 0);
    const endISO = new Date(startISO);
    endISO.setUTCMinutes(endISO.getUTCMinutes() + dur);
    await fetch("/api/calendar/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: ev.provider,
        id: ev.id,
        start: startISO.toISOString(),
        end: endISO.toISOString(),
      }),
    });
    setEvents((prev) => {
      const next: Record<string, GridEvent[]> = {};
      for (const k of Object.keys(prev))
        next[k] = prev[k].filter((x) => x.id !== ev.id);
      if (!next[dayISO]) next[dayISO] = [];
      next[dayISO].push({
        ...ev,
        start: startISO.toISOString(),
        end: endISO.toISOString(),
      });
      return next;
    });
  }

  function DraggableEvent({ ev }: { ev: GridEvent }) {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useDraggable({ id: ev.id });
    const style = {
      transform: transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
      transition,
    } as React.CSSProperties;
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="truncate rounded border px-1 py-0.5 text-xs bg-background cursor-grab select-none"
        {...attributes}
        {...listeners}
      >
        {ev.title}
      </div>
    );
  }

  function DayCell({ iso }: { iso: string }) {
    const { setNodeRef } = useDroppable({ id: iso });
    return (
      <button
        ref={setNodeRef}
        disabled={!iso}
        onClick={() => iso && createEvent(iso)}
        className={`min-h-[90px] bg-background p-2 text-left text-xs ${
          !iso ? "opacity-40" : "hover:bg-black/5"
        }`}
      >
        {iso && (
          <>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] opacity-70">
                {new Date(iso + "T00:00:00Z").getUTCDate()}
              </span>
              {/* reserved for count or actions */}
            </div>
            <div className="space-y-1">
              {(events[iso] || []).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-1"
                >
                  <DraggableEvent ev={e} />
                  <button
                    className="rounded border px-1 py-0.5 text-[10px]"
                    onClick={async (evt) => {
                      evt.preventDefault();
                      evt.stopPropagation();
                      await fetch("/api/calendar/events", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          provider: e.provider,
                          id: e.id,
                        }),
                      });
                      setEvents((prev) => {
                        const next = { ...prev } as Record<string, GridEvent[]>;
                        next[iso] = (next[iso] || []).filter(
                          (x) => x.id !== e.id
                        );
                        return next;
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </button>
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = e.active?.id?.toString();
    const overId = e.over?.id?.toString();
    if (!activeId || !overId) return;
    if (!/\d{4}-\d{2}-\d{2}/.test(overId)) return; // must be a day ISO
    const ev = Object.values(events)
      .flat()
      .find((x) => x.id === activeId);
    if (!ev) return;
    moveEventToDay(ev, overId);
  }

  function prevMonth() {
    const d = new Date(Date.UTC(year, month, 1));
    d.setUTCMonth(month - 1);
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }
  function nextMonth() {
    const d = new Date(Date.UTC(year, month, 1));
    d.setUTCMonth(month + 1);
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          className="rounded border px-2 py-1 text-xs"
          onClick={prevMonth}
        >
          &larr; Prev
        </button>
        <div className="text-sm font-medium">
          {new Date(Date.UTC(year, month, 1)).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={defaultProvider}
            onChange={(e) => setDefaultProvider(e.target.value as Provider)}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="google">Google</option>
            <option value="microsoft">Microsoft</option>
          </select>
          <button
            className="rounded border px-2 py-1 text-xs"
            onClick={nextMonth}
          >
            Next &rarr;
          </button>
        </div>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 gap-px rounded border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="bg-background p-2 text-center text-xs font-medium"
            >
              {d}
            </div>
          ))}
          {cells.map((iso, idx) => (
            <DayCell key={idx} iso={iso} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
