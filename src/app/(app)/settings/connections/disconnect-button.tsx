"use client";

import { useState } from "react";

export default function DisconnectButton({
  provider,
}: {
  provider: "google" | "microsoft" | "atlassian";
}) {
  const [loading, setLoading] = useState(false);
  async function disconnect() {
    setLoading(true);
    try {
      await fetch("/api/settings/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      // simple reload to reflect state
      location.reload();
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={disconnect}
      disabled={loading}
      className="rounded border px-3 py-1 text-sm"
    >
      {loading ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
