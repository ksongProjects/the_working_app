"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type JiraSearchIssue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    status?: { name?: string };
    project?: { key?: string };
    assignee?: { displayName?: string };
  };
};

export default function AddIssuesClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<JiraSearchIssue[]>([]);
  const [projects, setProjects] = useState<{ key: string; name: string }[]>([]);
  const [projectKey, setProjectKey] = useState<string>("");

  const jql = useMemo(() => {
    const parts: string[] = [
      "assignee = currentUser()",
      "resolution = Unresolved",
    ];
    if (projectKey) parts.push(`project = ${projectKey}`);
    if (query.trim()) {
      const escaped = query.replace(/"/g, '\\"');
      parts.push(`text ~ "${escaped}"`);
    }
    return `${parts.join(" AND ")} ORDER BY updated DESC`;
  }, [query, projectKey]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/jira/issues/search", window.location.origin);
      url.searchParams.set("jql", jql);
      url.searchParams.set("maxResults", "20");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`Search failed ${res.status}`);
      const data = await res.json();
      setResults(data.issues ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to search Jira issues");
    } finally {
      setLoading(false);
    }
  }, [jql]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/jira/projects", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const list = (data.values || data.projects || []).map((p: any) => ({
            key: p.key,
            name: p.name,
          }));
          setProjects(list);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const addToToday = useCallback(async (issueKey: string) => {
    try {
      const res = await fetch("/api/jira/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", issueKey }),
      });
      if (!res.ok) throw new Error("Add failed");
      toast.success(`Added ${issueKey} to Today`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add to Today");
    }
  }, []);

  return (
    <div className="rounded border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs">
          <span className="opacity-70">Project</span>
          <select
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your Jira issues (by text)"
          className="w-full rounded border px-2 py-1 text-sm"
        />
        <button
          onClick={runSearch}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-3 divide-y rounded border">
          {results.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs opacity-70">
                  {it.key}
                </div>
                <div className="truncate">{it.fields.summary}</div>
              </div>
              <div className="ml-2 whitespace-nowrap text-xs opacity-70">
                {it.fields.status?.name}
              </div>
              <button
                onClick={() => addToToday(it.key)}
                className="ml-3 rounded border px-2 py-1 text-xs"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
