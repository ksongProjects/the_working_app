import { auth } from "@/auth/config";
import { listGoogleEventsForDay } from "@/server/google/calendar";
import { listOutlookEventsForDay } from "@/server/microsoft/calendar";
import { prisma } from "@/lib/prisma";
import { getAtlassianClient } from "@/server/atlassian/client";

export default async function DebugPage() {
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) {
    return <div className="p-6 text-sm">Unauthorized</div>;
  }
  const date = new Date().toISOString().slice(0, 10);

  // Fetch accounts
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
    select: { provider: true, scopes: true, expiresAt: true, accountId: true },
  });

  // Try Google
  const google = await listGoogleEventsForDay(userId, date).catch(
    (e: unknown) => ({ error: e instanceof Error ? e.message : "Unknown" })
  );
  // Try Microsoft
  const microsoft = await listOutlookEventsForDay(userId, date).catch(
    (e: unknown) => ({ error: e instanceof Error ? e.message : "Unknown" })
  );
  // Try Jira: just verify client, and list TodayIssues cache if any
  const jiraClient = await getAtlassianClient(userId)
    .then(() => ({ ok: true }))
    .catch((e: unknown) => ({
      error: e instanceof Error ? e.message : "Unknown",
    }));
  const todayIssues = await prisma.todayIssue
    .findMany({ where: { userId }, orderBy: { orderIndex: "asc" }, take: 20 })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Debug: Connections & Data</h1>
      <p className="mt-1 text-sm opacity-80">
        Quickly verify provider tokens and initial data pulls.
      </p>

      <section className="mt-6">
        <h2 className="font-medium">Linked accounts</h2>
        <pre className="mt-2 overflow-auto rounded border bg-neutral-50 p-3 text-xs">
          {JSON.stringify(accounts, null, 2)}
        </pre>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-medium">Google calendar (today)</h2>
          <pre className="mt-2 overflow-auto rounded border bg-neutral-50 p-3 text-xs">
            {JSON.stringify(google, null, 2)}
          </pre>
        </div>
        <div>
          <h2 className="font-medium">Outlook calendar (today)</h2>
          <pre className="mt-2 overflow-auto rounded border bg-neutral-50 p-3 text-xs">
            {JSON.stringify(microsoft, null, 2)}
          </pre>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Jira</h2>
        <pre className="mt-2 overflow-auto rounded border bg-neutral-50 p-3 text-xs">
          {JSON.stringify(jiraClient, null, 2)}
        </pre>
        <h3 className="mt-4 text-sm font-medium">Today issues (local)</h3>
        <pre className="mt-2 overflow-auto rounded border bg-neutral-50 p-3 text-xs">
          {JSON.stringify(todayIssues, null, 2)}
        </pre>
      </section>
    </div>
  );
}
