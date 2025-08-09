"use client";

import { useMemo, useState } from "react";
import { useSelection } from "./Selection";
import { toast } from "sonner";

export default function DynamicEditor() {
  const { selected, clear } = useSelection();
  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-sm opacity-70">
        Select a Jira issue, a schedule block, or a calendar event to edit
      </div>
    );
  }
  if (selected.kind === "jira")
    return <JiraEditor issueKey={selected.issueKey} onClose={clear} />;
  if (selected.kind === "schedule")
    return (
      <ScheduleEditor
        id={selected.id}
        initialTitle={selected.title}
        initialStart={selected.start}
        initialEnd={selected.end}
        onClose={clear}
      />
    );
  return (
    <CalendarEditor
      provider={selected.provider}
      id={selected.id}
      initialTitle={selected.title}
      initialStart={selected.start || null}
      initialEnd={selected.end || null}
      onClose={clear}
    />
  );
}

function JiraEditor({
  issueKey,
  onClose,
}: {
  issueKey: string;
  onClose: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Jira: {issueKey}</div>
        <button className="rounded border px-2 py-1 text-xs" onClick={onClose}>
          Close
        </button>
      </div>
      <div>
        <div className="mb-1 text-xs opacity-70">Add comment</div>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="h-24 w-full rounded border p-2 text-sm"
          placeholder="Write a quick comment..."
        />
        <button
          onClick={async () => {
            if (!commentText.trim()) return;
            const res = await fetch(`/api/jira/issue/${issueKey}/comment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: commentText }),
            });
            if (!res.ok) return toast.error("Comment failed");
            toast.success("Comment added");
            setCommentText("");
          }}
          className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs text-white"
        >
          Post comment
        </button>
      </div>
      <div>
        <div className="mb-1 text-xs opacity-70">Update description</div>
        <textarea
          value={descriptionText}
          onChange={(e) => setDescriptionText(e.target.value)}
          className="h-24 w-full rounded border p-2 text-sm"
          placeholder="New description..."
        />
        <button
          onClick={async () => {
            if (!descriptionText.trim()) return;
            const res = await fetch(`/api/jira/issue/${issueKey}/description`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: descriptionText }),
            });
            if (!res.ok) return toast.error("Update failed");
            toast.success("Description updated");
            setDescriptionText("");
          }}
          className="mt-2 rounded bg-green-600 px-2 py-1 text-xs text-white"
        >
          Save description
        </button>
      </div>
    </div>
  );
}

function ScheduleEditor({
  id,
  initialTitle,
  initialStart,
  initialEnd,
  onClose,
}: {
  id: string;
  initialTitle: string;
  initialStart: string;
  initialEnd: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Schedule block</div>
        <button className="rounded border px-2 py-1 text-xs" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="grid gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-xs opacity-70">Title</span>
          <input
            className="rounded border px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs opacity-70">Start (ISO)</span>
          <input
            className="rounded border px-2 py-1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs opacity-70">End (ISO)</span>
          <input
            className="rounded border px-2 py-1"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
            onClick={async () => {
              const res = await fetch("/api/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update",
                  id,
                  title,
                  start,
                  end,
                }),
              });
              if (!res.ok) return toast.error("Update failed");
              toast.success("Updated");
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarEditor({
  provider,
  id,
  initialTitle,
  initialStart,
  initialEnd,
  onClose,
}: {
  provider: "google" | "microsoft";
  id: string;
  initialTitle: string;
  initialStart: string | null;
  initialEnd: string | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [start, setStart] = useState(initialStart || "");
  const [end, setEnd] = useState(initialEnd || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canSave = useMemo(
    () => !!title && (!!start || !!end),
    [title, start, end]
  );

  async function update(method: "update" | "delete") {
    if (method === "update") {
      setSaving(true);
    } else {
      setDeleting(true);
    }
    try {
      const res = await fetch(`/api/calendar/events`, {
        method: method === "update" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, id, title, start, end }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success(method === "update" ? "Event updated" : "Event deleted");
    } catch (e) {
      toast.error(method === "update" ? "Update failed" : "Delete failed");
    } finally {
      setSaving(false);
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {provider === "google" ? "Google" : "Outlook"} event
        </div>
        <button className="rounded border px-2 py-1 text-xs" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="grid gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-xs opacity-70">Title</span>
          <input
            className="rounded border px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs opacity-70">Start (ISO)</span>
          <input
            className="rounded border px-2 py-1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs opacity-70">End (ISO)</span>
          <input
            className="rounded border px-2 py-1"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            disabled={!canSave || saving}
            onClick={() => update("update")}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className="rounded border px-3 py-1 text-xs disabled:opacity-50"
            disabled={deleting}
            onClick={() => update("delete")}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
