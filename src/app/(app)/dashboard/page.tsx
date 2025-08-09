import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth/config";
import { SelectionProvider } from "@/components/Selection";
import DynamicEditor from "@/components/DynamicEditor";
import CalendarPanel from "@/components/CalendarPanel";
import SchedulerWithControls from "@/components/SchedulerWithControls";
import DashboardLayout from "@/components/DashboardLayout";
import LayoutSwitcher from "@/components/LayoutSwitcher";
import ZoneEditor from "@/components/ZoneEditor";
import ZoneEditorDnD from "@/components/ZoneEditorDnD";

const AddIssuesClient = dynamic(() => import("../today/AddIssuesClient"));
const TodayListClient = dynamic(() => import("../today/TodayListClient"));
const TimelineClient = dynamic(() => import("../schedule/TimelineClient"));

async function getTodayIssues(userId: string) {
  return prisma.todayIssue.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
  });
}

async function getTodayTotals(userId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const entries = await prisma.timeEntry.findMany({
    where: { userId, startedAt: { gte: start, lte: end } },
  });
  let ms = 0;
  for (const e of entries) {
    const stop = e.endedAt ?? new Date();
    ms += Math.max(0, stop.getTime() - e.startedAt.getTime());
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return { hours, minutes };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return <div className="p-6 text-sm">Please sign in.</div>;
  const [issues, totals] = await Promise.all([
    getTodayIssues(userId),
    getTodayTotals(userId),
  ]);
  const dateISO = new Date().toISOString().slice(0, 10);
  // Read layout settings
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const layout = (settings?.dashboardLayout as any) || "threeColumn";
  const zones = (settings?.dashboardZones as any) || {};

  return (
    <SelectionProvider>
      <div className="mx-auto max-w-[1400px] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <LayoutSwitcher initial={layout} />
            <ZoneEditorDnD layout={layout} initialZones={zones} />
            <div className="text-xs opacity-80">
              Today total: {totals.hours}h {totals.minutes}m
            </div>
          </div>
        </div>
        <DashboardLayout
          layout={layout}
          zones={zones}
          dateISO={dateISO}
          todayIssues={issues}
        />
      </div>
    </SelectionProvider>
  );
}
