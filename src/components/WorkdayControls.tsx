"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function parseHHMM(value: string): number | null {
  // value like "09:00" → minutes since midnight
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  return h * 60 + mm;
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function WorkdayControls({
  children,
}: {
  children: (rangeStartMin: number, rangeEndMin: number) => React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [startMin, setStartMin] = useState(9 * 60);
  const [endMin, setEndMin] = useState(17 * 60);

  const startStr = useMemo(() => toHHMM(startMin), [startMin]);
  const endStr = useMemo(() => toHHMM(endMin), [endMin]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const s = await res.json();
          const ws = s?.workdayStart ? new Date(s.workdayStart) : null;
          const we = s?.workdayEnd ? new Date(s.workdayEnd) : null;
          if (ws) setStartMin(ws.getUTCHours() * 60 + ws.getUTCMinutes());
          if (we) setEndMin(we.getUTCHours() * 60 + we.getUTCMinutes());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Save is now managed on the Settings page

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          <span className="text-xs opacity-70">Start</span>
          <input
            type="time"
            value={startStr}
            onChange={(e) => {
              const v = parseHHMM(e.target.value);
              if (v !== null) setStartMin(v);
            }}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-xs opacity-70">End</span>
          <input
            type="time"
            value={endStr}
            onChange={(e) => {
              const v = parseHHMM(e.target.value);
              if (v !== null) setEndMin(v);
            }}
            className="rounded border px-2 py-1"
          />
        </label>
      </div>
      {/* Render child with current range */}
      {children(startMin, endMin)}
    </div>
  );
}
