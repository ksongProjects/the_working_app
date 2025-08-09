"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [google, setGoogle] = useState<number | "">("");
  const [microsoft, setMicrosoft] = useState<number | "">("");
  const [atlassian, setAtlassian] = useState<number | "">("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const s = await res.json();
          setGoogle(s?.googleSyncIntervalMinutes ?? "");
          setMicrosoft(s?.microsoftSyncIntervalMinutes ?? "");
          setAtlassian(s?.atlassianSyncIntervalMinutes ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleSyncIntervalMinutes: google === "" ? null : Number(google),
          microsoftSyncIntervalMinutes:
            microsoft === "" ? null : Number(microsoft),
          atlassianSyncIntervalMinutes:
            atlassian === "" ? null : Number(atlassian),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Sync intervals saved");
    } catch {
      toast.error("Failed to save sync intervals");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border p-4">
      <div className="text-sm font-medium">Sync intervals (minutes)</div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <div className="mb-1">Google</div>
          <input
            type="number"
            className="w-full rounded border px-2 py-1"
            value={google}
            onChange={(e) =>
              setGoogle(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="e.g. 15"
          />
        </label>
        <label className="text-sm">
          <div className="mb-1">Microsoft</div>
          <input
            type="number"
            className="w-full rounded border px-2 py-1"
            value={microsoft}
            onChange={(e) =>
              setMicrosoft(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="e.g. 15"
          />
        </label>
        <label className="text-sm">
          <div className="mb-1">Atlassian</div>
          <input
            type="number"
            className="w-full rounded border px-2 py-1"
            value={atlassian}
            onChange={(e) =>
              setAtlassian(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="e.g. 10"
          />
        </label>
      </div>
      <button
        onClick={save}
        disabled={loading}
        className="mt-4 rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save intervals"}
      </button>
    </div>
  );
}
