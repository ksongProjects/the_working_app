"use client";

import { signIn } from "next-auth/react";

export default function ConnectButton({
  provider,
  label,
  callbackConnected,
}: {
  provider: "google" | "azure-ad" | "atlassian";
  label: string;
  callbackConnected: string; // e.g., 'google'
}) {
  async function onClick() {
    const callbackUrl = `/settings/connections?connected=${encodeURIComponent(
      callbackConnected
    )}`;
    await signIn(provider, { callbackUrl, redirect: true });
  }

  return (
    <button onClick={onClick} className="rounded border px-3 py-1 text-sm">
      {label}
    </button>
  );
}



