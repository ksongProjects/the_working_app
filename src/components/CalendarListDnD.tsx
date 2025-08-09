"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import EventCreateModal from "./EventCreateModal";

type Provider = "google" | "microsoft";
type EventItem = {
  id: string;
  title: string;
  start?: string;
  end?: string;
  provider: Provider;
};

function Row({
  item,
  onMove,
}: {
  item: EventItem;
  onMove: (id: string, dayISO: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded border p-2 text-sm"
      {...attributes}
    >
      <div className="truncate">
        <div className="font-medium">{item.title}</div>
        <div className="text-xs opacity-70">
          {item.start} — {item.end}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded border px-2 py-0.5 text-[10px] capitalize">
          {item.provider}
        </span>
      </div>
    </div>
  );
}

export default function CalendarListDnD({
  dateISO: initialDateISO,
}: {
  dateISO?: string;
}) {
  const [dateISO, setDateISO] = useState(
    initialDateISO || new Date().toISOString().slice(0, 10)
  );
  const [itemsByDay, setItemsByDay] = useState<Record<string, EventItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<"all" | Provider>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDayISO, setCreateDayISO] = useState<string | null>(null);
  const days = useMemo(() => {
    // Render a 7-day window centered on selected date
    const base = new Date(dateISO + "T00:00:00Z");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [dateISO]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = new URL("/api/calendar/events", window.location.origin);
        url.searchParams.set("date", dateISO);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const rows: EventItem[] = [];
          const google = (data.google || data.items || []).map((e: any) => ({
            id: e.id,
            title: e.summary ?? e.subject ?? "(no title)",
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
            provider: "google" as const,
          }));
          const microsoft = (data.microsoft || []).map((e: any) => ({
            id: e.id,
            title: e.subject ?? e.summary ?? "(no title)",
            start: e.start?.dateTime,
            end: e.end?.dateTime,
            provider: "microsoft" as const,
          }));
          rows.push(...google, ...microsoft);
          // Group by day ISO
          const by: Record<string, EventItem[]> = {};
          for (const r of rows) {
            const day = (r.start || "").slice(0, 10) || dateISO;
            if (!by[day]) by[day] = [];
            by[day].push(r);
          }
          setItemsByDay(by);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [dateISO]);

  function getTimeParts(iso?: string): { hh: number; mm: number } | null {
    if (!iso || iso.length < 16 || !iso.includes("T")) return null;
    const m = /T(\d{2}):(\d{2})/.exec(iso);
    if (!m) return null;
    return { hh: Number(m[1]), mm: Number(m[2]) };
  }

  function getDurationMinutes(start?: string, end?: string): number {
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

  async function moveEventToDay(ev: EventItem, dayISO: string) {
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
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = e.active?.id?.toString();
    const overId = e.over?.id?.toString();
    if (!activeId || !overId) return;
    const ev = Object.values(itemsByDay)
      .flat()
      .find((it) => it.id === activeId);
    if (!ev) return;
    let targetDay = days.includes(overId) ? overId : null;
    if (!targetDay) {
      for (const d of Object.keys(itemsByDay)) {
        if ((itemsByDay[d] || []).some((x) => x.id === overId)) {
          targetDay = d;
          break;
        }
      }
    }
    if (!targetDay) return;
    moveEventToDay(ev, targetDay).then(() => {
      setItemsByDay((prev) => {
        const next: Record<string, EventItem[]> = {};
        for (const d of Object.keys(prev))
          next[d] = prev[d].filter((x) => x.id !== ev.id);
        if (!next[targetDay!]) next[targetDay!] = [];
        const time = getTimeParts(ev.start) || { hh: 9, mm: 0 };
        const dur = getDurationMinutes(ev.start, ev.end);
        const s = new Date(`${targetDay}T00:00:00Z`);
        s.setUTCHours(time.hh, time.mm, 0, 0);
        const e2 = new Date(s);
        e2.setUTCMinutes(e2.getUTCMinutes() + dur);
        next[targetDay!].push({
          ...ev,
          start: s.toISOString(),
          end: e2.toISOString(),
        });
        return next;
      });
    });
  }

  function DayBucket({
    dayISO,
    children,
  }: {
    dayISO: string;
    children: React.ReactNode;
  }) {
    const { setNodeRef } = useDroppable({ id: dayISO });
    return (
      <div ref={setNodeRef} id={dayISO} className="rounded border p-2">
        <div className="mb-1 flex items-center justify-between">
          <div className="font-mono text-xs opacity-70">{dayISO}</div>
          <button
            className="rounded border px-2 py-0.5 text-[10px]"
            onClick={() => {
              setCreateDayISO(dayISO);
              setCreateOpen(true);
            }}
          >
            + New
          </button>
        </div>
        {children}
      </div>
    );
  }

  function toHHMM(iso?: string): string {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "";
    }
  }

  function DayEventEditable({ ev, dayISO }: { ev: EventItem; dayISO: string }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(ev.title);
    const [start, setStart] = useState(toHHMM(ev.start) || "09:00");
    const [end, setEnd] = useState(toHHMM(ev.end) || "10:00");
    async function save() {
      const startISO = `${dayISO}T${start}:00Z`;
      const endISO = `${dayISO}T${end}:00Z`;
      await fetch("/api/calendar/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: ev.provider,
          id: ev.id,
          title,
          start: startISO,
          end: endISO,
        }),
      });
      setItemsByDay((prev) => {
        const next = { ...prev } as Record<string, EventItem[]>;
        next[dayISO] = (next[dayISO] || []).map((e) =>
          e.id === ev.id ? { ...e, title, start: startISO, end: endISO } : e
        );
        return next;
      });
      setEditing(false);
    }
    return (
      <div className="rounded border p-1">
        {!editing ? (
          <div className="flex items-center justify-between">
            <div className="truncate">{ev.title}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] opacity-70">
                {toHHMM(ev.start)}–{toHHMM(ev.end)}
              </span>
              <button
                className="rounded border px-1 py-0.5 text-[10px]"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 rounded border px-1 py-0.5 text-xs"
            />
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded border px-1 py-0.5 text-xs"
            />
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded border px-1 py-0.5 text-xs"
            />
            <button
              className="rounded border px-1 py-0.5 text-[10px]"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              className="rounded bg-blue-600 px-2 py-0.5 text-[10px] text-white"
              onClick={save}
            >
              Save
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div>
          <div className="font-medium">Weekly Calendar</div>
          <div className="opacity-70">
            {days[0]} — {days[days.length - 1]}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="opacity-70">Provider</span>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as any)}
            className="rounded border px-2 py-1"
          >
            <option value="all">All</option>
            <option value="google">Google</option>
            <option value="microsoft">Microsoft</option>
          </select>
        </label>
        {loading && <span className="opacity-70">Loading…</span>}
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="space-y-3">
          {days.map((d) => (
            <DayBucket key={d} dayISO={d}>
              <SortableContext
                items={(itemsByDay[d] || []).map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 text-xs opacity-90">
                  {(itemsByDay[d] || [])
                    .filter(
                      (e) =>
                        providerFilter === "all" ||
                        e.provider === providerFilter
                    )
                    .map((e) => (
                      <DayEventEditable key={e.id} ev={e} dayISO={d} />
                    ))}
                </div>
              </SortableContext>
            </DayBucket>
          ))}
        </div>
      </DndContext>
      <EventCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialDateISO={createDayISO || dateISO}
        initialProvider={providerFilter === "all" ? "google" : providerFilter}
        onCreated={(ev) => {
          setItemsByDay((prev) => {
            const day = ev.start.slice(0, 10);
            const next = { ...prev };
            if (!next[day]) next[day] = [];
            next[day].push({
              id: ev.id,
              title: ev.title,
              provider: ev.provider,
              start: ev.start,
              end: ev.end,
            });
            return next;
          });
        }}
      />
    </div>
  );
}
