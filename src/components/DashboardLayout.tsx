"use client";

import dynamic from "next/dynamic";
import CalendarPanel from "./CalendarPanel";
import DynamicEditor from "./DynamicEditor";
import SchedulerWithControls from "./SchedulerWithControls";

const AddIssuesClient = dynamic(
  () => import("@/app/(app)/today/AddIssuesClient")
);
const TodayListClient = dynamic(
  () => import("@/app/(app)/today/TodayListClient")
);

type Widget = "scheduler" | "jira" | "calendar" | "editor";

export type DashboardZones = Record<string, Widget>;

export default function DashboardLayout({
  layout,
  zones,
  dateISO,
  todayIssues,
}: {
  layout: "threeColumn" | "twoByTwo" | "split";
  zones: DashboardZones;
  dateISO: string;
  todayIssues: any[];
}) {
  function renderWidget(w: Widget) {
    switch (w) {
      case "scheduler":
        return <SchedulerWithControls dateISO={dateISO} />;
      case "jira":
        return (
          <div>
            <AddIssuesClient />
            <div className="mt-2">
              <TodayListClient initial={todayIssues as any} />
            </div>
          </div>
        );
      case "calendar":
        return <CalendarPanel />;
      case "editor":
      default:
        return <DynamicEditor />;
    }
  }

  if (layout === "twoByTwo") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border p-3 min-h-[320px]">
          {renderWidget(zones["topLeft"] || "scheduler")}
        </div>
        <div className="rounded border p-3 min-h-[320px]">
          {renderWidget(zones["topRight"] || "calendar")}
        </div>
        <div className="rounded border p-3 min-h-[320px]">
          {renderWidget(zones["bottomLeft"] || "jira")}
        </div>
        <div className="rounded border p-3 min-h-[320px]">
          {renderWidget(zones["bottomRight"] || "editor")}
        </div>
      </div>
    );
  }

  if (layout === "split") {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border p-3 min-h-[560px]">
          {renderWidget(zones["left"] || "scheduler")}
        </div>
        <div className="rounded border p-3 min-h-[560px]">
          {renderWidget(zones["right"] || "editor")}
        </div>
      </div>
    );
  }

  // default: threeColumn
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)_520px]">
      <div className="space-y-4">
        <div className="rounded border p-3">
          {renderWidget(zones["leftTop"] || "scheduler")}
        </div>
        <div className="rounded border p-3">
          {renderWidget(zones["leftBottom"] || "jira")}
        </div>
      </div>
      <div className="rounded border p-3 min-h-[560px]">
        {renderWidget(zones["center"] || "editor")}
      </div>
      <div className="rounded border p-3">
        {renderWidget(zones["right"] || "calendar")}
      </div>
    </div>
  );
}
