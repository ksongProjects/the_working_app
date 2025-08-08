"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Today = { id: string; issueKey: string; notes: string | null };

function Row({
  item,
  onStart,
  onStop,
  onRemove,
}: {
  item: Today;
  onStart: (k: string) => void;
  onStop: (k: string) => void;
  onRemove: (k: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.issueKey });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded border p-3"
      {...attributes}
    >
      <div className="flex items-center gap-2">
        <button
          aria-label="Drag"
          {...listeners}
          className="cursor-grab rounded border px-2 py-1 text-xs"
        >
          ↕
        </button>
        <div className="truncate">
          <div className="font-medium">{item.issueKey}</div>
          {item.notes && <div className="text-xs opacity-70">{item.notes}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStart(item.issueKey)}
          className="rounded border px-2 py-1 text-xs"
        >
          Start
        </button>
        <button
          onClick={() => onStop(item.issueKey)}
          className="rounded border px-2 py-1 text-xs"
        >
          Stop
        </button>
        <button
          onClick={() => onRemove(item.issueKey)}
          className="rounded border px-2 py-1 text-xs text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function TodayListClient({ initial }: { initial: Today[] }) {
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");

  async function onStart(issueKey: string) {
    const body = new FormData();
    body.append("sourceType", "jira");
    body.append("sourceId", issueKey);
    const res = await fetch("/api/time/start", { method: "POST", body });
    if (!res.ok) return toast.error("Start failed");
    toast.success(`Started ${issueKey}`);
  }
  async function onStop(issueKey: string) {
    const body = new FormData();
    body.append("sourceType", "jira");
    body.append("sourceId", issueKey);
    const res = await fetch("/api/time/stop", { method: "POST", body });
    if (!res.ok) return toast.error("Stop failed");
    toast.success(`Stopped ${issueKey}`);
  }
  async function onRemove(issueKey: string) {
    const res = await fetch("/api/jira/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", issueKey }),
    });
    if (!res.ok) return toast.error("Remove failed");
    setItems((prev) => prev.filter((p) => p.issueKey !== issueKey));
  }

  async function addComment(issueKey: string) {
    if (!commentText.trim()) return;
    const res = await fetch(`/api/jira/issue/${issueKey}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText }),
    });
    if (!res.ok) return toast.error("Comment failed");
    toast.success("Comment added");
    setCommentText("");
  }

  async function updateDescription(issueKey: string) {
    if (!descriptionText.trim()) return;
    const res = await fetch(`/api/jira/issue/${issueKey}/description`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: descriptionText }),
    });
    if (!res.ok) return toast.error("Update failed");
    toast.success("Description updated");
    setDescriptionText("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.issueKey === active.id);
    const newIndex = items.findIndex((i) => i.issueKey === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    fetch("/api/jira/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        order: next.map((n) => n.issueKey),
      }),
    }).catch(() => toast.error("Reorder failed"));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((i) => i.issueKey)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-6 space-y-2">
          {items.length === 0 && (
            <div className="rounded border p-4 text-sm opacity-75">
              No issues yet.
            </div>
          )}
          {items.map((i) => (
            <div key={i.issueKey} className="space-y-2">
              <Row
                item={i}
                onStart={onStart}
                onStop={onStop}
                onRemove={onRemove}
              />
              <div className="flex items-center gap-2 pl-10">
                <button
                  onClick={() => {
                    if (editingKey === i.issueKey) {
                      setEditingKey(null);
                      setCommentText("");
                      setDescriptionText("");
                    } else {
                      setEditingKey(i.issueKey);
                      setCommentText("");
                      setDescriptionText("");
                    }
                  }}
                  className="rounded border px-2 py-1 text-xs"
                >
                  {editingKey === i.issueKey ? "Close" : "Edit"}
                </button>
              </div>
              {editingKey === i.issueKey && (
                <div className="ml-10 rounded border p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium opacity-70">
                        Add comment
                      </div>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="h-24 w-full rounded border p-2 text-sm"
                        placeholder="Write a quick comment..."
                      />
                      <button
                        onClick={() => addComment(i.issueKey)}
                        className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs text-white"
                      >
                        Post comment
                      </button>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium opacity-70">
                        Update description
                      </div>
                      <textarea
                        value={descriptionText}
                        onChange={(e) => setDescriptionText(e.target.value)}
                        className="h-24 w-full rounded border p-2 text-sm"
                        placeholder="New description..."
                      />
                      <button
                        onClick={() => updateDescription(i.issueKey)}
                        className="mt-2 rounded bg-green-600 px-2 py-1 text-xs text-white"
                      >
                        Save description
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
