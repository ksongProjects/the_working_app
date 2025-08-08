import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth/config";
import dynamic from "next/dynamic";
const AddIssuesClient = dynamic(() => import("./AddIssuesClient"), {
  ssr: false,
});
const TodayListClient = dynamic(() => import("./TodayListClient"), {
  ssr: false,
});

async function getTodayIssues(userId: string) {
  const issues = await prisma.todayIssue.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
  });

  // Attach lastPushedAt per issue from recent TimeEntry
  const withPush = await Promise.all(
    issues.map(async (i) => {
      const last = await prisma.timeEntry.findFirst({
        where: {
          userId,
          sourceType: "jira",
          sourceId: i.issueKey,
          pushedToJiraWorklogAt: { not: null },
        },
        orderBy: { pushedToJiraWorklogAt: "desc" },
        select: { pushedToJiraWorklogAt: true },
      });
      return { ...i, lastPushedAt: last?.pushedToJiraWorklogAt ?? null } as any;
    })
  );
  return withPush;
}

export default async function TodayPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return (
      <div className="p-6">
        <p className="text-sm">
          Please{" "}
          <Link href="/api/auth/signin" className="underline">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }
  const issues = await getTodayIssues(userId);
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Today</h1>
      <p className="mt-1 text-sm opacity-80">Your selected Jira issues</p>

      <div className="mt-4">
        <AddIssuesClient />
      </div>

      <TodayListClient initial={issues as any} />
    </div>
  );
}
