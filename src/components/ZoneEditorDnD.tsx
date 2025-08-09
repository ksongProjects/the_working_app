"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Layout = "threeColumn" | "twoByTwo" | "split";
type Widget = "scheduler" | "jira" | "calendar" | "editor";
type Zones = Record<string, Widget>;

function slotsForLayout(layout: Layout): string[] {
  if (layout === "twoByTwo")
    return ["topLeft", "topRight", "bottomLeft", "bottomRight"];
  if (layout === "split") return ["left", "right"];
  return ["leftTop", "leftBottom", "center", "right"]; // threeColumn default
}

const WIDGETS: { id: Widget; label: string }[] = [
  { id: "scheduler", label: "Today's Scheduler" },
  { id: "jira", label: "Jira Today" },
  { id: "calendar", label: "Calendar" },
  { id: "editor", label: "Editor" },
];

function Pill({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab select-none rounded border bg-background px-2 py-1 text-xs"
      {...attributes}
      {...listeners}
    >
      {label}
    </div>
  );
}

export default function ZoneEditorDnD({
  layout,
  initialZones,
}: {
  layout: Layout;
  initialZones: Zones;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<Zones>(initialZones || {});

  const slots = useMemo(() => slotsForLayout(layout), [layout]);
  const assignedWidgets = useMemo(() => new Set(Object.values(zones)), [zones]);
  const palette = useMemo(
    () => WIDGETS.filter((w) => !assignedWidgets.has(w.id)),
    [assignedWidgets]
  );

  useEffect(() => {
    // Ensure required slots exist
    setZones((prev) => {
      const next = { ...prev } as Zones;
      for (const s of slots) if (!next[s]) next[s] = "scheduler";
      for (const key of Object.keys(next))
        if (!slots.includes(key)) delete next[key];
      return next;
    });
  }, [slots]);

  function onDragEnd(evt: DragEndEvent) {
    const active = evt.active?.id?.toString();
    const over = evt.over?.id?.toString();
    if (!active || !over) return;
    // If dragging a widget pill onto a slot, set that slot
    const isWidget = WIDGETS.some((w) => w.id === active);
    const isSlot = slots.includes(over);
    if (isWidget && isSlot) {
      // Remove previous slot with same widget (enforce uniqueness)
      setZones((prev) => {
        const next = { ...prev } as Zones;
        for (const s of Object.keys(next))
          if (next[s] === (active as Widget))
            next[s] =
              next[s] === "scheduler" ? "scheduler" : (next[s] as Widget);
        next[over] = active as Widget;
        // Ensure uniqueness by removing duplicates
        for (const s of Object.keys(next)) {
          if (s !== over && next[s] === next[over]) next[s] = "scheduler";
        }
        return next;
      });
      return;
    }
    // Swap widgets between slots
    if (isSlot && slots.includes(active)) {
      setZones((prev) => {
        const next = { ...prev } as Zones;
        const a = active;
        const b = over;
        const tmp = next[a];
        next[a] = next[b];
        next[b] = tmp;
        return next;
      });
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardZones: zones }),
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="text-xs">
      <button
        className="rounded border px-2 py-1"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close layout slots" : "Drag slots"}
      </button>
      {open && (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="mt-2 flex flex-col gap-3">
            <div>
              <div className="mb-1 opacity-70">Palette</div>
              <SortableContext
                items={palette.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="flex flex-wrap gap-2 rounded border p-2">
                  {palette.map((p) => (
                    <Pill key={p.id} id={p.id} label={p.label} />
                  ))}
                </div>
              </SortableContext>
            </div>
            <div>
              <div className="mb-1 opacity-70">Slots</div>
              <SortableContext items={slots} strategy={rectSortingStrategy}>
                <div className="grid gap-2 md:grid-cols-2">
                  {slots.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between gap-2 rounded border p-2"
                    >
                      <div className="font-mono">{slot}</div>
                      <Pill
                        id={slot}
                        label={
                          WIDGETS.find((w) => w.id === zones[slot])?.label ||
                          "(empty)"
                        }
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                className="rounded border px-2 py-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
                disabled={saving}
                onClick={save}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </DndContext>
      )}
    </div>
  );
}
