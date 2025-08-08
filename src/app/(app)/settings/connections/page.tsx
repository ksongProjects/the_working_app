import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth/config";

async function getData(userId: string) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
    select: { provider: true, accountId: true, expiresAt: true, scopes: true },
  });
  return accounts;
}

export default async function ConnectionsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const accounts = userId
    ? await getData(userId)
    : ([] as Array<{ provider: string }>);
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Connected accounts</h1>
      <p className="mt-1 text-sm opacity-80">Link your calendars and Jira.</p>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Google</div>
            <div className="text-xs opacity-70">Calendar read/write</div>
          </div>
          <Link
            href="/api/auth/signin/google"
            className="rounded border px-3 py-1 text-sm"
          >
            {accounts.some((a) => a.provider === "google")
              ? "Re-connect"
              : "Connect"}
          </Link>
        </div>
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Microsoft</div>
            <div className="text-xs opacity-70">
              Outlook calendar read/write
            </div>
          </div>
          <Link
            href="/api/auth/signin/azure-ad"
            className="rounded border px-3 py-1 text-sm"
          >
            {accounts.some((a) => a.provider === "microsoft")
              ? "Re-connect"
              : "Connect"}
          </Link>
        </div>
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Atlassian</div>
            <div className="text-xs opacity-70">
              Jira issues, comments, worklogs
            </div>
          </div>
          <Link
            href="/api/auth/signin/atlassian"
            className="rounded border px-3 py-1 text-sm"
          >
            {accounts.some((a) => a.provider === "atlassian")
              ? "Re-connect"
              : "Connect"}
          </Link>
        </div>
        {!userId && (
          <p className="text-sm opacity-70">Sign in to manage connections.</p>
        )}
      </div>
    </div>
  );
}
