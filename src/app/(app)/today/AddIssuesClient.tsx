"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import ConnectButton from "@/app/(app)/settings/connections/connect-button";
import { RefreshCw } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

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
  const [query, setQuery] = useState(""); // client-side filter only
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<JiraSearchIssue[]>([]);
  const [projects, setProjects] = useState<{ key: string; name: string }[]>([]);
  const [projectKey, setProjectKey] = useState<string>("");
  const [category, setCategory] = useState<"recent" | "top" | "upcoming">(
    "recent"
  );
  const [needsAtlassian, setNeedsAtlassian] = useState(false);
  const [atlassianConnected, setAtlassianConnected] = useState<boolean | null>(
    null
  );

  const jql = useMemo(() => {
    const parts: string[] = [
      "assignee = currentUser()",
      "resolution = Unresolved",
    ];
    if (projectKey) parts.push(`project = ${projectKey}`);
    let order = "ORDER BY updated DESC";
    if (category === "top") {
      order = "ORDER BY priority DESC, updated DESC";
    } else if (category === "upcoming") {
      parts.push("duedate IS NOT EMPTY");
      parts.push("duedate <= endOfWeek()");
      order = "ORDER BY duedate ASC, priority DESC";
    }
    return `${parts.join(" AND ")} ${order}`;
  }, [projectKey, category]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/jira/issues/search", window.location.origin);
      url.searchParams.set("jql", jql);
      url.searchParams.set("maxResults", "20");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.status === 401) {
        setNeedsAtlassian(true);
        setResults([]);
        return;
      }
      if (!res.ok) {
        let detail: string | undefined;
        try {
          const body = await res.json();
          detail = typeof body?.error === "string" ? body.error : undefined;
        } catch {}
        console.error("Jira search failed", res.status, detail);
        toast.error("Failed to search Jira issues");
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.issues ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to search Jira issues");
    } finally {
      setLoading(false);
    }
  }, [jql]);

  const projectsQuery = useQuery({
    queryKey: ["jira-projects"],
    queryFn: async () => {
      const res = await fetch("/api/jira/projects", { cache: "no-store" });
      if (res.status === 401) {
        return {
          items: [] as Array<{ key: string; name: string }>,
          disconnected: true,
        };
      }
      if (!res.ok) throw new Error("projects");
      const data = await res.json();
      type JiraProject = { key: string; name: string };
      const raw = (data.items ||
        data.values ||
        data.projects ||
        []) as JiraProject[];
      return {
        items: raw.map((p) => ({ key: p.key, name: p.name })),
        disconnected: false,
      };
    },
    staleTime: 5 * 60_000,
    enabled: atlassianConnected === true,
  });
  // Detect connection status once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/connections", {
          cache: "no-store",
        });
        if (res.status === 401) {
          setAtlassianConnected(false);
          setNeedsAtlassian(true);
          return;
        }
        if (!res.ok) {
          setAtlassianConnected(false);
          setNeedsAtlassian(true);
          return;
        }
        const data = await res.json();
        const has = Array.isArray(data?.accounts)
          ? data.accounts.some(
              (a: { provider?: string }) => a.provider === "atlassian"
            )
          : false;
        setAtlassianConnected(has);
        setNeedsAtlassian(!has);
      } catch {
        setAtlassianConnected(false);
        setNeedsAtlassian(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!projectsQuery.data) return;
    const data = projectsQuery.data as
      | { items: Array<{ key: string; name: string }>; disconnected: boolean }
      | Array<{ key: string; name: string }>;
    // Back-compat: if older shape (array)
    if (Array.isArray(data)) {
      setProjects(data);
      setNeedsAtlassian(false);
    } else {
      setProjects(data.items);
      setNeedsAtlassian(data.disconnected);
    }
  }, [projectsQuery.data]);

  // Auto-run search when project changes
  useEffect(() => {
    if (needsAtlassian || atlassianConnected !== true) return;
    if (projects.length === 0 && !projectKey) return; // wait until projects fetched or selection made
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, needsAtlassian, atlassianConnected]);
  // Auto-run search when category changes
  useEffect(() => {
    if (needsAtlassian || atlassianConnected !== true) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, needsAtlassian, atlassianConnected]);

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

  // Client-side filtered data for table rendering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return results;
    return results.filter((it) => {
      const parts = [
        it.key,
        it.fields.summary,
        it.fields.status?.name || "",
        it.fields.assignee?.displayName || "",
        it.fields.project?.key || "",
      ]
        .join("\n")
        .toLowerCase();
      return parts.includes(q);
    });
  }, [results, query]);

  const columns = useMemo<ColumnDef<JiraSearchIssue>[]>(
    () => [
      {
        header: "Key",
        accessorFn: (row) => row.key,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs opacity-80">
            {String(getValue())}
          </span>
        ),
      },
      {
        header: "Summary",
        accessorFn: (row) => row.fields.summary,
        cell: ({ getValue }) => (
          <span className="truncate block">{String(getValue())}</span>
        ),
      },
      {
        header: "Status",
        accessorFn: (row) => row.fields.status?.name || "",
        cell: ({ getValue }) => (
          <span className="text-xs opacity-70">{String(getValue())}</span>
        ),
      },
      {
        header: "Assignee",
        accessorFn: (row) => row.fields.assignee?.displayName || "",
        cell: ({ getValue }) => (
          <span className="text-xs opacity-70">{String(getValue())}</span>
        ),
      },
      {
        header: "Project",
        accessorFn: (row) => row.fields.project?.key || "",
        cell: ({ getValue }) => (
          <span className="text-xs opacity-70">{String(getValue())}</span>
        ),
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <button
            onClick={() => addToToday(row.original.key)}
            className="ml-3 rounded border px-2 py-1 text-xs"
          >
            Add
          </button>
        ),
      },
    ],
    [addToToday]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded border p-3">
      {needsAtlassian && (
        <div className="mb-3 rounded border border-amber-400 bg-background p-3 text-sm">
          <div className="mb-2 font-medium">
            Connect Atlassian to search Jira
          </div>
          <div className="flex items-center gap-2">
            <ConnectButton
              provider="atlassian"
              label="Connect"
              callbackConnected="atlassian"
            />
            <a href="/settings" className="rounded border px-3 py-1 text-xs">
              Manage connections
            </a>
          </div>
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-xs">
          <button
            className={`rounded px-2 py-1 ${
              category === "recent" ? "border bg-black/5" : "border"
            }`}
            onClick={() => setCategory("recent")}
          >
            Recently updated
          </button>
          <button
            className={`rounded px-2 py-1 ${
              category === "top" ? "border bg-black/5" : "border"
            }`}
            onClick={() => setCategory("top")}
          >
            Top priority
          </button>
          <button
            className={`rounded px-2 py-1 ${
              category === "upcoming" ? "border bg-black/5" : "border"
            }`}
            onClick={() => setCategory("upcoming")}
          >
            Upcoming dates
          </button>
        </div>
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
        <button
          onClick={runSearch}
          disabled={loading}
          title="Refresh issues"
          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs disabled:opacity-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter issues (key, summary, status, assignee, project)"
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div className="overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-xs">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b px-2 py-1 text-left font-medium"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-black/5">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1 align-top">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-2 py-6 text-center text-xs opacity-70"
                  >
                    {loading ? "Loading issues…" : "No issues"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
