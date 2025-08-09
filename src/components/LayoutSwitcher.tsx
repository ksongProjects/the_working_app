"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Layout = "threeColumn" | "twoByTwo" | "split";

export default function LayoutSwitcher({ initial }: { initial: Layout }) {
  const [layout, setLayout] = useState<Layout>(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => setLayout(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardLayout: layout }),
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="opacity-70">Layout</span>
      <select
        value={layout}
        onChange={(e) => setLayout(e.target.value as Layout)}
        className="rounded border px-2 py-1"
      >
        <option value="threeColumn">Three columns</option>
        <option value="twoByTwo">2×2 grid</option>
        <option value="split">Split</option>
      </select>
      <button
        onClick={save}
        className="rounded border px-2 py-1 disabled:opacity-50"
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
