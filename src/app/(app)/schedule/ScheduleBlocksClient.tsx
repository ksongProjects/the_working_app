"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Block = { id: string; title: string; start: string; end: string };

export default function ScheduleBlocksClient({ dateISO }: { dateISO: string }) {
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [mirror, setMirror] = useState<"none" | "google" | "microsoft">("none");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${dateISO}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data: { items?: Array<{ id: string; title: string; start: string; end: string }> } = await res.json();
        setBlocks(
          (data.items || []).map((b) => ({
            id: b.id,
            title: b.title,
            start: b.start,
            end: b.end,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO]);

  async function create() {
    if (!title.trim()) return;
    const startISO = new Date(`${dateISO}T${start}:00Z`).toISOString();
    const endISO = new Date(`${dateISO}T${end}:00Z`).toISOString();
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title,
        start: startISO,
        end: endISO,
        mirrorTo: mirror === "none" ? null : mirror,
      }),
    });
    if (!res.ok) return toast.error("Create failed");
    setTitle("");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) return toast.error("Delete failed");
    await load();
  }

  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
    []
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="text-xs opacity-70">Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <div className="text-xs opacity-70">Start</div>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs opacity-70">End</div>
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-1 text-xs opacity-80">Mirror to calendar</div>
        <select
          value={mirror}
          onChange={(e) => setMirror(e.target.value as 'none' | 'google' | 'microsoft')}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="none">None</option>
          <option value="google">Google</option>
          <option value="microsoft">Microsoft</option>
        </select>
        <button
          onClick={create}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          Add block
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading && <div className="text-sm opacity-70">Loading…</div>}
        {!loading && blocks.length === 0 && (
          <div className="text-sm opacity-70">No blocks yet.</div>
        )}
        {blocks.map((b: Block) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded border p-2 text-sm"
          >
            <div>
              <div className="font-medium">{b.title}</div>
              <div className="opacity-70">
                {new Date(b.start).toLocaleTimeString()} —{" "}
                {new Date(b.end).toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={() => remove(b.id)}
              className="rounded border px-2 py-1"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
