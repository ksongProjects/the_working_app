import { prisma } from "@/lib/prisma";
import SettingsEditor from "./settings-editor";
import PostConnectInit from "./PostConnectInit";
import DisconnectButton from "./disconnect-button";
// import Link from "next/link";
import ConnectButton from "./connect-button";
import { auth } from "@/auth/config";

async function getData(userId: string) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
    select: { provider: true, accountId: true, expiresAt: true, scopes: true },
  });
  return accounts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ConnectionsPage(props: any) {
  const { searchParams } = (props || {}) as { searchParams?: Record<string, string | string[]> };
  const session = await auth();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  const accounts = userId
    ? await getData(userId)
    : ([] as Array<{ provider: string }>);
  const connected =
    typeof searchParams?.connected === "string"
      ? (searchParams!.connected as string)
      : undefined;
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
          {accounts.some((a) => a.provider === "google") ? (
            <ConnectButton
              provider="google"
              label="Re-connect"
              callbackConnected="google"
            />
          ) : (
            <ConnectButton
              provider="google"
              label="Connect"
              callbackConnected="google"
            />
          )}
          {accounts.some((a) => a.provider === "google") && (
            <DisconnectButton provider="google" />
          )}
        </div>
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Microsoft</div>
            <div className="text-xs opacity-70">
              Outlook calendar read/write
            </div>
          </div>
          {accounts.some((a) => a.provider === "microsoft") ? (
            <ConnectButton
              provider="azure-ad"
              label="Re-connect"
              callbackConnected="microsoft"
            />
          ) : (
            <ConnectButton
              provider="azure-ad"
              label="Connect"
              callbackConnected="microsoft"
            />
          )}
          {accounts.some((a) => a.provider === "microsoft") && (
            <DisconnectButton provider="microsoft" />
          )}
        </div>
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Atlassian</div>
            <div className="text-xs opacity-70">
              Jira issues, comments, worklogs
            </div>
          </div>
          {accounts.some((a) => a.provider === "atlassian") ? (
            <ConnectButton
              provider="atlassian"
              label="Re-connect"
              callbackConnected="atlassian"
            />
          ) : (
            <ConnectButton
              provider="atlassian"
              label="Connect"
              callbackConnected="atlassian"
            />
          )}
          {accounts.some((a) => a.provider === "atlassian") && (
            <DisconnectButton provider="atlassian" />
          )}
        </div>
        {!userId && (
          <p className="text-sm opacity-70">Sign in to manage connections.</p>
        )}
      </div>
      {/* Post-connect init */}
      <PostConnectInit provider={connected} />

      {/* Per-provider sync intervals */}
      <div className="mt-10">
        <SettingsEditor />
      </div>
    </div>
  );
}
