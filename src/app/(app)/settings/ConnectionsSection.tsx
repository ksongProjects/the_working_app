"use client";

import { useEffect, useState } from "react";
import ConnectButton from "./connections/connect-button";
import DisconnectButton from "./connections/disconnect-button";
import SettingsEditor from "./connections/settings-editor";
import PostConnectInit from "./connections/PostConnectInit";
import { useSearchParams } from "next/navigation";

type AccountInfo = {
  provider: string;
  accountId?: string;
  expiresAt?: string;
  scopes?: string | null;
};

export default function ConnectionsSection() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const searchParams = useSearchParams();
  const connected = searchParams?.get("connected") || undefined;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings/connections", {
          cache: "no-store",
        });
        if (res.status === 401) {
          setAuthorized(false);
          setAccounts([]);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { accounts?: AccountInfo[] };
          setAuthorized(true);
          setAccounts(data.accounts ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const has = (provider: string) =>
    accounts.some((a) => a.provider === provider);

  return (
    <div>
      <h2 className="text-sm font-medium">Connections</h2>
      <p className="mt-1 text-sm opacity-80">Link your calendars and Jira.</p>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Google</div>
            <div className="text-xs opacity-70">Calendar read/write</div>
          </div>
          {has("google") ? (
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
          {has("google") && <DisconnectButton provider="google" />}
        </div>

        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Microsoft</div>
            <div className="text-xs opacity-70">
              Outlook calendar read/write
            </div>
          </div>
          {has("microsoft") ? (
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
          {has("microsoft") && <DisconnectButton provider="microsoft" />}
        </div>

        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <div className="font-medium">Atlassian</div>
            <div className="text-xs opacity-70">
              Jira issues, comments, worklogs
            </div>
          </div>
          {has("atlassian") ? (
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
          {has("atlassian") && <DisconnectButton provider="atlassian" />}
        </div>
        {!authorized && (
          <p className="text-sm opacity-70">Sign in to manage connections.</p>
        )}
      </div>

      <PostConnectInit provider={connected} />

      <div className="mt-8">
        <SettingsEditor />
      </div>
    </div>
  );
}
