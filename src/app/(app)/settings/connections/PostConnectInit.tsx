"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function PostConnectInit({ provider }: { provider?: string }) {
  useEffect(() => {
    if (!provider) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/settings/connections/init?provider=${encodeURIComponent(
            provider
          )}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success(`${provider} connected`, {
            description: data?.message || "Initial sync started.",
          });
        } else {
          toast.error(`Init failed: ${provider}`, {
            description: data?.error || "Unknown error",
          });
        }
      } catch {
        toast.error(`Init failed: ${provider}`);
      }
    })();
  }, [provider]);
  return null;
}

