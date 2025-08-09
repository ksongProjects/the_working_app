"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  async function sign(
    provider: "credentials" | "google" | "azure-ad" | "atlassian"
  ) {
    setLoading(provider);
    try {
      if (provider === "credentials") {
        await signIn(provider, { email, name, callbackUrl: "/" });
      } else {
        await signIn(provider, { callbackUrl: "/" });
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-8">
      <div className="w-full max-w-sm rounded-lg border p-4">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm opacity-80">Choose a provider</p>
        <div className="mt-4 space-y-2">
          <div className="rounded border p-3">
            <div className="text-sm font-medium">App account</div>
            <div className="mt-2 space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded border px-2 py-2 text-sm"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded border px-2 py-2 text-sm"
              />
              <button
                onClick={() => sign("credentials")}
                disabled={loading !== null || !email}
                className="w-full rounded-md bg-neutral-700 px-3 py-2 text-white disabled:opacity-50"
              >
                {loading === "credentials"
                  ? "Signing in…"
                  : "Continue with Email (app account)"}
              </button>
            </div>
          </div>
          <button
            onClick={() => sign("google")}
            disabled={loading !== null}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
          >
            {loading === "google" ? "Signing in…" : "Continue with Google"}
          </button>
          <button
            onClick={() => sign("azure-ad")}
            disabled={loading !== null}
            className="w-full rounded-md bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          >
            {loading === "azure-ad" ? "Signing in…" : "Continue with Microsoft"}
          </button>
          <button
            onClick={() => sign("atlassian")}
            disabled={loading !== null}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {loading === "atlassian"
              ? "Signing in…"
              : "Continue with Atlassian"}
          </button>
        </div>
      </div>
    </div>
  );
}
