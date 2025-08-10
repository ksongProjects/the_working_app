"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ConnectionsSection from "./ConnectionsSection";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [autoPushWorklog, setAutoPushWorklog] = useState(false);
  const [defaultWorklogCommentTemplate, setDefaultWorklogCommentTemplate] =
    useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

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
          if (
            s?.theme === "light" ||
            s?.theme === "dark" ||
            s?.theme === "system"
          ) {
            setTheme(s.theme);
          }
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
          theme,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
      try {
        localStorage.setItem("themePreference", theme);
        const root = document.documentElement;
        if (theme === "light") root.setAttribute("data-theme", "light");
        else if (theme === "dark") root.setAttribute("data-theme", "dark");
        else root.removeAttribute("data-theme");
      } catch {}
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="mt-6 space-y-8">
        <section>
          <h2 className="text-sm font-medium">General</h2>
          <div className="mt-4 space-y-4">
            <div className="text-sm">
              <div className="mb-1 font-medium">Theme</div>
              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value as "light" | "dark" | "system")
                }
                className="w-full rounded border p-2 bg-background"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
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
                onChange={(e) =>
                  setDefaultWorklogCommentTemplate(e.target.value)
                }
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
        </section>
        <section>
          <ConnectionsSection />
        </section>
      </div>
    </div>
  );
}
