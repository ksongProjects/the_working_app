"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [google, setGoogle] = useState<number | "">("");
  const [microsoft, setMicrosoft] = useState<number | "">("");
  const [atlassian, setAtlassian] = useState<number | "">("");
  const [googleBefore, setGoogleBefore] = useState<number | "">("");
  const [googleAfter, setGoogleAfter] = useState<number | "">("");
  const [msBefore, setMsBefore] = useState<number | "">("");
  const [msAfter, setMsAfter] = useState<number | "">("");
  const [jiraProjects, setJiraProjects] = useState<
    Array<{ key: string; name: string }>
  >([]);
  const [jiraDashboards, setJiraDashboards] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedProjectKeys, setSelectedProjectKeys] = useState<string[]>([]);
  const [selectedDashboardIds, setSelectedDashboardIds] = useState<string[]>(
    []
  );

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
          setGoogleBefore(s?.googleMonthsBefore ?? "");
          setGoogleAfter(s?.googleMonthsAfter ?? "");
          setMsBefore(s?.microsoftMonthsBefore ?? "");
          setMsAfter(s?.microsoftMonthsAfter ?? "");
          setSelectedProjectKeys(s?.jiraSelectedProjectKeys ?? []);
          setSelectedDashboardIds(s?.jiraSelectedDashboardIds ?? []);
        }
        // Load Jira resources in parallel
        const [projRes, dashRes] = await Promise.all([
          fetch("/api/jira/projects", { cache: "no-store" }).catch(() => null),
          fetch("/api/jira/dashboards", { cache: "no-store" }).catch(
            () => null
          ),
        ]);
        if (projRes && projRes.ok) {
          const data = await projRes.json();
          setJiraProjects(
            (data.items || []).map((p: { key: string; name: string }) => ({ key: p.key, name: p.name }))
          );
        }
        if (dashRes && dashRes.ok) {
          const data = await dashRes.json();
          setJiraDashboards(
            (data.items || []).map((d: { id: string | number; name: string }) => ({
              id: String(d.id),
              name: d.name,
            }))
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
          googleSyncIntervalMinutes: google === "" ? null : Number(google),
          microsoftSyncIntervalMinutes:
            microsoft === "" ? null : Number(microsoft),
          atlassianSyncIntervalMinutes:
            atlassian === "" ? null : Number(atlassian),
          googleMonthsBefore: googleBefore === "" ? null : Number(googleBefore),
          googleMonthsAfter: googleAfter === "" ? null : Number(googleAfter),
          microsoftMonthsBefore: msBefore === "" ? null : Number(msBefore),
          microsoftMonthsAfter: msAfter === "" ? null : Number(msAfter),
          jiraSelectedProjectKeys: selectedProjectKeys,
          jiraSelectedDashboardIds: selectedDashboardIds,
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
    <div className="rounded border p-4 space-y-6">
      <div>
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
                setMicrosoft(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
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
                setAtlassian(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="e.g. 10"
            />
          </label>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium">
          Calendar range (months before/after current month)
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1">Google: Months before</div>
            <input
              type="number"
              className="w-full rounded border px-2 py-1"
              value={googleBefore}
              onChange={(e) =>
                setGoogleBefore(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="e.g. 3"
              min={0}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1">Google: Months after</div>
            <input
              type="number"
              className="w-full rounded border px-2 py-1"
              value={googleAfter}
              onChange={(e) =>
                setGoogleAfter(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="e.g. 3"
              min={0}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1">Microsoft: Months before</div>
            <input
              type="number"
              className="w-full rounded border px-2 py-1"
              value={msBefore}
              onChange={(e) =>
                setMsBefore(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="e.g. 3"
              min={0}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1">Microsoft: Months after</div>
            <input
              type="number"
              className="w-full rounded border px-2 py-1"
              value={msAfter}
              onChange={(e) =>
                setMsAfter(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="e.g. 3"
              min={0}
            />
          </label>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium">
          Jira: Select projects and dashboards
        </div>
        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1 text-sm">Projects</div>
            <div className="max-h-40 overflow-auto rounded border p-2 text-sm">
              {jiraProjects.length === 0 && (
                <div className="opacity-70">No projects or not connected</div>
              )}
              {jiraProjects.map((p) => (
                <label key={p.key} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedProjectKeys.includes(p.key)}
                    onChange={(e) => {
                      setSelectedProjectKeys((prev) =>
                        e.target.checked
                          ? Array.from(new Set([...prev, p.key]))
                          : prev.filter((k) => k !== p.key)
                      );
                    }}
                  />
                  <span>
                    <span className="font-medium">{p.key}</span> — {p.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm">Dashboards</div>
            <div className="max-h-40 overflow-auto rounded border p-2 text-sm">
              {jiraDashboards.length === 0 && (
                <div className="opacity-70">No dashboards or not connected</div>
              )}
              {jiraDashboards.map((d) => (
                <label key={d.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedDashboardIds.includes(d.id)}
                    onChange={(e) => {
                      setSelectedDashboardIds((prev) =>
                        e.target.checked
                          ? Array.from(new Set([...prev, d.id]))
                          : prev.filter((k) => k !== d.id)
                      );
                    }}
                  />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={loading}
        className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
