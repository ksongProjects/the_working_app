"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  async function handleSignIn() {
    setLoading(true);
    try {
      await signIn("email", { email: "you@example.com", callbackUrl: "/" });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center p-8">
      <div className="w-full max-w-sm rounded-lg border p-4">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm opacity-80">Demo: email link sign-in</p>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending link…" : "Continue with Email"}
        </button>
      </div>
    </div>
  );
}
