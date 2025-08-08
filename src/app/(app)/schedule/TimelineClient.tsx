"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Block = { id: string; title: string; start: string; end: string };

const MINUTE_HEIGHT = 1; // 1px per minute → 60px/hour
const GRID_MINUTES = 15;

function minutesSinceMidnight(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function roundToGridMinutes(mins: number) {
  const step = GRID_MINUTES;
  return Math.round(mins / step) * step;
}

export default function TimelineClient({ dateISO }: { dateISO: string }) {
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const dayStart = useMemo(() => new Date(`${dateISO}T00:00:00Z`), [dateISO]);
  // const dayEnd = useMemo(() => new Date(`${dateISO}T23:59:59Z`), [dateISO]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${dateISO}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setBlocks(
          (data.items || []).map(
            (b: { id: string; title: string; start: string; end: string }) => ({
              id: b.id,
              title: b.title,
              start: b.start,
              end: b.end,
            })
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [dateISO]);

  useEffect(() => {
    load();
  }, [load]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  function toISO(dateBase: Date, minutesFromStart: number) {
    const dt = new Date(dateBase);
    dt.setUTCMinutes(minutesFromStart);
    return dt.toISOString();
  }

  async function updateBlock(
    id: string,
    startISO?: string,
    endISO?: string,
    title?: string
  ) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id,
        start: startISO,
        end: endISO,
        title,
      }),
    });
    if (!res.ok) toast.error("Update failed");
  }

  return (
    <div className="mt-6">
      <div
        className="relative grid grid-cols-[80px_1fr] border"
        ref={containerRef}
      >
        {/* Hour labels */}
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              className="flex h-[60px] items-start justify-end pr-2 text-xs opacity-70 border-b"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="relative">
          {/* grid rows */}
          {hours.map((h) => (
            <div key={h} className="h-[60px] border-b" />
          ))}

          {/* blocks */}
          <div className="absolute inset-0">
            {blocks.map((b) => {
              const start = new Date(b.start);
              const end = new Date(b.end);
              const topMin = clamp(minutesSinceMidnight(start), 0, 24 * 60);
              let endMin = clamp(minutesSinceMidnight(end), 0, 24 * 60);
              if (endMin <= topMin) endMin = topMin + GRID_MINUTES;
              const height = (endMin - topMin) * MINUTE_HEIGHT;
              const top = topMin * MINUTE_HEIGHT;

              return (
                <BlockItem
                  key={b.id}
                  id={b.id}
                  title={b.title}
                  top={top}
                  height={height}
                  onDrag={(deltaY) => {
                    const deltaMin = Math.round(deltaY / MINUTE_HEIGHT);
                    const nextStart = clamp(
                      roundToGridMinutes(topMin + deltaMin),
                      0,
                      24 * 60 - GRID_MINUTES
                    );
                    const duration = endMin - topMin;
                    const nextEnd = clamp(
                      nextStart + duration,
                      GRID_MINUTES,
                      24 * 60
                    );
                    setBlocks((prev) =>
                      prev.map((p) =>
                        p.id === b.id
                          ? {
                              ...p,
                              start: toISO(dayStart, nextStart),
                              end: toISO(dayStart, nextEnd),
                            }
                          : p
                      )
                    );
                  }}
                  onDragEnd={async () => {
                    const nb = blocks.find((x) => x.id === b.id);
                    if (nb) await updateBlock(nb.id, nb.start, nb.end);
                  }}
                  onResize={(deltaY) => {
                    const deltaMin = Math.round(deltaY / MINUTE_HEIGHT);
                    const nextEnd = clamp(
                      roundToGridMinutes(endMin + deltaMin),
                      topMin + GRID_MINUTES,
                      24 * 60
                    );
                    setBlocks((prev) =>
                      prev.map((p) =>
                        p.id === b.id
                          ? {
                              ...p,
                              end: toISO(dayStart, nextEnd),
                            }
                          : p
                      )
                    );
                  }}
                  onResizeEnd={async () => {
                    const nb = blocks.find((x) => x.id === b.id);
                    if (nb) await updateBlock(nb.id, undefined, nb.end);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      {loading && (
        <div className="mt-2 text-sm opacity-70">Loading timeline…</div>
      )}
    </div>
  );
}

function BlockItem(props: {
  id: string;
  title: string;
  top: number;
  height: number;
  onDrag: (deltaY: number) => void;
  onDragEnd: () => void;
  onResize: (deltaY: number) => void;
  onResizeEnd: () => void;
}) {
  const { title, top, height, onDrag, onDragEnd, onResize, onResizeEnd } =
    props;
  const draggingRef = useRef<null | {
    type: "move" | "resize";
    startY: number;
  }>(null);

  const onPointerDownMove = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { type: "move", startY: e.clientY };
  };
  const onPointerDownResize = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { type: "resize", startY: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - draggingRef.current.startY;
    if (draggingRef.current.type === "move") onDrag(deltaY);
    else onResize(deltaY);
  };
  const onPointerUp = () => {
    if (!draggingRef.current) return;
    const type = draggingRef.current.type;
    draggingRef.current = null;
    if (type === "move") onDragEnd();
    else onResizeEnd();
  };

  return (
    <div
      className="absolute left-0 right-2 rounded border bg-blue-100 shadow"
      style={{ top, height }}
    >
      <div
        className="cursor-grab select-none px-2 py-1 text-xs font-medium"
        onPointerDown={onPointerDownMove}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {title}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 cursor-ns-resize border-t bg-blue-200/60 px-2 py-0.5 text-[10px]"
        onPointerDown={onPointerDownResize}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        drag to resize
      </div>
    </div>
  );
}
