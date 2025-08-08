import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth/config";
import dynamic from "next/dynamic";
const AddIssuesClient = dynamic(() => import("./AddIssuesClient"), { ssr: false });

async function getTodayIssues(userId: string) {
  const issues = await prisma.todayIssue.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
  });
  return issues;
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

      <div className="mt-6 space-y-2">
        {issues.length === 0 && (
          <div className="rounded border p-4 text-sm opacity-75">
            No issues yet.
          </div>
        )}
        {issues.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div className="truncate">
              <div className="font-medium">{i.issueKey}</div>
              {i.notes && <div className="text-xs opacity-70">{i.notes}</div>}
            </div>
            <div className="flex items-center gap-2">
              <form action={`/api/time/start`} method="post">
                <input type="hidden" name="sourceType" value="jira" />
                <input type="hidden" name="sourceId" value={i.issueKey} />
                <button className="rounded border px-2 py-1 text-xs">
                  Start
                </button>
              </form>
              <form action={`/api/time/stop`} method="post">
                <input type="hidden" name="sourceType" value="jira" />
                <input type="hidden" name="sourceId" value={i.issueKey} />
                <button className="rounded border px-2 py-1 text-xs">
                  Stop
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
