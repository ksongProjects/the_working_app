"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelection } from "./Selection";
import dynamic from "next/dynamic";
const CalendarListDnD = dynamic(() => import("./CalendarListDnD"), {
  ssr: false,
});
const CalendarMonthGrid = dynamic(() => import("./CalendarMonthGrid"), {
  ssr: false,
});

type Item = { id: string; title: string; start?: string; end?: string };

export default function CalendarPanel() {
  const { select } = useSelection();
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [showGoogle, setShowGoogle] = useState(true);
  const [showMicrosoft, setShowMicrosoft] = useState(true);
  const [google, setGoogle] = useState<Item[]>([]);
  const [microsoft, setMicrosoft] = useState<Item[]>([]);

  function parseAsUTC(iso?: string): Date | null {
    if (!iso) return null;
    try {
      if (iso.length === 10) return new Date(iso + "T00:00:00Z");
      return new Date(iso);
    } catch {
      return null;
    }
  }
  function formatDayLabel(dayIso: string): string {
    try {
      const d = new Date(dayIso + "T00:00:00Z");
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dayIso;
    }
  }
  function formatTimeRange(start?: string, end?: string): string {
    const s = parseAsUTC(start);
    const e = parseAsUTC(end);
    if (!s && !e) return "";
    if (start && start.length === 10) return "All day";
    const fmt: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
    };
    return `${s ? s.toLocaleTimeString(undefined, fmt) : ""}${
      e ? " — " + e.toLocaleTimeString(undefined, fmt) : ""
    }`;
  }
  function groupByDay(items: Item[]): Record<string, Item[]> {
    const by: Record<string, Item[]> = {};
    for (const it of items) {
      const day = (it.start || "").slice(0, 10) || dateISO;
      if (!by[day]) by[day] = [];
      by[day].push(it);
    }
    // sort by start time within day
    for (const k of Object.keys(by))
      by[k].sort(
        (a, b) =>
          (parseAsUTC(a.start)?.getTime() || 0) -
          (parseAsUTC(b.start)?.getTime() || 0)
      );
    return by;
  }

  const providerParam = useMemo(() => {
    if (showGoogle && showMicrosoft) return undefined;
    if (showGoogle) return "google";
    if (showMicrosoft) return "microsoft";
    return "none"; // special to avoid fetch
  }, [showGoogle, showMicrosoft]);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", { dateISO, providerParam }],
    queryFn: async () => {
      if (providerParam === "none") return { google: [], microsoft: [] };
      const url = new URL("/api/calendar/events", window.location.origin);
      url.searchParams.set("date", dateISO);
      if (providerParam) url.searchParams.set("provider", providerParam);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as {
        items?: unknown[];
        google?: unknown[];
        microsoft?: unknown[];
      };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const data = eventsQuery.data as
      | { items?: unknown[]; google?: unknown[]; microsoft?: unknown[] }
      | undefined;
    setLoading(eventsQuery.isLoading);
    if (!data) return;
    type Raw = {
      id: string;
      subject?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    };
    const g = ((data.google || data.items || []) as unknown as Raw[]) || [];
    const m = ((data.microsoft || []) as unknown as Raw[]) || [];
    setGoogle(
      g.map((e) => ({
        id: e.id,
        title: e.summary ?? e.subject ?? "(no title)",
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
      }))
    );
    setMicrosoft(
      m.map((e) => ({
        id: e.id,
        title: e.subject ?? e.summary ?? "(no title)",
        start: e.start?.dateTime,
        end: e.end?.dateTime,
      }))
    );
  }, [eventsQuery.data, eventsQuery.isLoading]);

  const [view, setView] = useState<"list" | "month">("list");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2">
        <div className="text-sm font-medium">Calendar</div>
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <span className="opacity-70">Week starting..</span>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          />
        </label>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as "list" | "month")}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="list">List (DnD)</option>
          <option value="month">Month grid</option>
        </select>
      </div>
      {view === "list" && (
        <div className="mb-2 text-xs opacity-70">
          {(() => {
            const base = new Date(dateISO + "T00:00:00Z");
            const start = new Date(base);
            const end = new Date(base);
            end.setUTCDate(end.getUTCDate() + 6);
            const fmt: Intl.DateTimeFormatOptions = {
              month: "short",
              day: "numeric",
            };
            return `Week of ${start.toLocaleDateString(
              undefined,
              fmt
            )} — ${end.toLocaleDateString(undefined, fmt)}`;
          })()}
        </div>
      )}
      {view === "month" ? (
        <div className="mt-2">
          <CalendarMonthGrid />
        </div>
      ) : (
        <div className="mt-2">
          <CalendarListDnD dateISO={dateISO} />
        </div>
      )}
    </div>
  );
}
