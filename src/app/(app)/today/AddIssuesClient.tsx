"use client";

import { useCallback, useMemo, useState } from "react";
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

  const jql = useMemo(() => {
    if (!query.trim()) {
      return 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC';
    }
    const escaped = query.replace(/"/g, '\\"');
    return `assignee = currentUser() AND text ~ "${escaped}" ORDER BY updated DESC`;
  }, [query]);

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
      <div className="flex items-center gap-2">
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
            <div key={it.id} className="flex items-center justify-between p-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs opacity-70">{it.key}</div>
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


