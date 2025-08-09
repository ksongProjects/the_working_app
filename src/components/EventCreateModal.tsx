"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Provider = "google" | "microsoft";

export default function EventCreateModal({
  open,
  onClose,
  initialDateISO,
  initialStartHHMM = "09:00",
  initialEndHHMM = "10:00",
  initialProvider = "google",
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  initialDateISO: string; // YYYY-MM-DD
  initialStartHHMM?: string;
  initialEndHHMM?: string;
  initialProvider?: Provider;
  onCreated?: (event: {
    id: string;
    title: string;
    provider: Provider;
    start: string;
    end: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [date, setDate] = useState(initialDateISO);
  const [start, setStart] = useState(initialStartHHMM);
  const [end, setEnd] = useState(initialEndHHMM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setProvider(initialProvider);
    setDate(initialDateISO);
    setStart(initialStartHHMM);
    setEnd(initialEndHHMM);
  }, [open, initialDateISO, initialStartHHMM, initialEndHHMM, initialProvider]);

  async function submit() {
    if (!title.trim()) return toast.error("Please enter a title");
    setSaving(true);
    try {
      const startISO = new Date(`${date}T${start}:00Z`).toISOString();
      const endISO = new Date(`${date}T${end}:00Z`).toISOString();
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          title: title.trim(),
          start: startISO,
          end: endISO,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json().catch(() => ({} as any));
      const id = data?.id || Math.random().toString(36).slice(2);
      toast.success("Event created");
      onCreated?.({
        id,
        title: title.trim(),
        provider,
        start: startISO,
        end: endISO,
      });
      onClose();
    } catch (e) {
      toast.error("Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded bg-background p-4 shadow">
        <div className="mb-2 text-sm font-semibold">Create event</div>
        <div className="grid gap-2 text-sm">
          <label className="grid gap-1">
            <span className="text-xs opacity-70">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border px-2 py-1"
              placeholder="Event title"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs opacity-70">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="rounded border px-2 py-1"
              >
                <option value="google">Google</option>
                <option value="microsoft">Microsoft</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs opacity-70">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded border px-2 py-1"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs opacity-70">Start</span>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded border px-2 py-1"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs opacity-70">End</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded border px-2 py-1"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded border px-2 py-1 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
