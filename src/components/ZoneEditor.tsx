"use client";

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

const widgetOptions: { value: Widget; label: string }[] = [
  { value: "scheduler", label: "Today's Scheduler" },
  { value: "jira", label: "Jira Today" },
  { value: "calendar", label: "Calendar" },
  { value: "editor", label: "Editor" },
];

export default function ZoneEditor({
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

  // Reset visible slots when layout changes
  useEffect(() => {
    setZones((prev) => {
      const slots = slotsForLayout(layout);
      const next: Zones = { ...prev };
      // Ensure required slots exist with defaults
      for (const s of slots) {
        if (!next[s]) {
          // provide sensible defaults per layout
          if (layout === "twoByTwo") {
            next[s] =
              s === "topLeft"
                ? "scheduler"
                : s === "topRight"
                ? "calendar"
                : s === "bottomLeft"
                ? "jira"
                : "editor";
          } else if (layout === "split") {
            next[s] = s === "left" ? "scheduler" : "editor";
          } else {
            next[s] =
              s === "leftTop"
                ? "scheduler"
                : s === "leftBottom"
                ? "jira"
                : s === "center"
                ? "editor"
                : "calendar";
          }
        }
      }
      // Remove slots not in current layout
      for (const key of Object.keys(next))
        if (!slots.includes(key)) delete next[key];
      return { ...next };
    });
  }, [layout]);

  const visibleSlots = useMemo(() => slotsForLayout(layout), [layout]);

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
        {open ? "Close layout slots" : "Edit layout slots"}
      </button>
      {open && (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {visibleSlots.map((slot) => (
            <label
              key={slot}
              className="flex items-center justify-between gap-2 rounded border px-2 py-1"
            >
              <span className="mr-2 font-mono">{slot}</span>
              <select
                className="rounded border px-2 py-1"
                value={zones[slot] || "scheduler"}
                onChange={(e) =>
                  setZones((z) => ({ ...z, [slot]: e.target.value as Widget }))
                }
              >
                {widgetOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
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
      )}
    </div>
  );
}
