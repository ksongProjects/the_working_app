"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [autoPushWorklog, setAutoPushWorklog] = useState(false);
  const [defaultWorklogCommentTemplate, setDefaultWorklogCommentTemplate] =
    useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const s = await res.json();
          setAutoPushWorklog(!!s?.autoPushWorklog);
          setDefaultWorklogCommentTemplate(
            s?.defaultWorklogCommentTemplate || ""
          );
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
          autoPushWorklog,
          defaultWorklogCommentTemplate,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="mt-6 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoPushWorklog}
            onChange={(e) => setAutoPushWorklog(e.target.checked)}
          />
          Push Jira worklog on Stop
        </label>
        <div className="text-sm">
          <div className="mb-1 font-medium">Default worklog comment</div>
          <textarea
            value={defaultWorklogCommentTemplate}
            onChange={(e) => setDefaultWorklogCommentTemplate(e.target.value)}
            className="h-24 w-full rounded border p-2"
            placeholder="What did you do?"
          />
        </div>
        <button
          onClick={save}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
