"use client";

import WorkdayControls from "./WorkdayControls";
import dynamic from "next/dynamic";

const TimelineClient = dynamic(
  () => import("@/app/(app)/schedule/TimelineClient"),
  { ssr: false }
);

export default function SchedulerWithControls({
  dateISO,
}: {
  dateISO: string;
}) {
  const [plannedMinutes, setPlannedMinutes] = useState(0);
  const [workdayMinutes, setWorkdayMinutes] = useState(8 * 60);
  return (
    <div>
      <WorkdayControls>
        {(startMin, endMin) => {
          const totalWorkday = Math.max(0, endMin - startMin);
          // Avoid setState during render: defer to effect when value changes
          useEffect(() => {
            setWorkdayMinutes(totalWorkday);
          }, [totalWorkday]);
          return (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <div />
                <div className="opacity-80">
                  <span className="mr-3">
                    Total: {formatMins(totalWorkday)}
                  </span>
                  <span className="mr-3">
                    Planned: {formatMins(plannedMinutes)}
                  </span>
                  <LiveActualHours />
                </div>
              </div>
              <div className="rounded border p-2">
                <TimelineClient
                  dateISO={dateISO}
                  rangeStartMin={startMin}
                  rangeEndMin={endMin}
                  onMetrics={({ plannedMinutes: pm }) => setPlannedMinutes(pm)}
                />
              </div>
            </div>
          );
        }}
      </WorkdayControls>
    </div>
  );
}

import { useEffect, useState } from "react";

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function LiveActualHours() {
  const [minutesToday, setMinutesToday] = useState(0);
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const url = new URL("/api/time/open", window.location.origin);
        url.searchParams.set("totals", "1");
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && typeof data.minutes === "number")
          setMinutesToday(data.minutes);
      } catch {}
    }
    // Poll actual minutes every 30s
    const id = setInterval(load, 30000);
    load();
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
  return <span>Actual: {formatMins(minutesToday)}</span>;
}
