"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  React.useEffect(() => {
    const root = document.documentElement;
    let mediaQuery: MediaQueryList | null = null;

    function setThemeAttribute(theme: "light" | "dark" | "system") {
      if (theme === "light") {
        root.setAttribute("data-theme", "light");
      } else if (theme === "dark") {
        root.setAttribute("data-theme", "dark");
      } else {
        root.removeAttribute("data-theme");
      }
    }

    function applySystemListener(enabled: boolean) {
      if (enabled) {
        mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
          const pref =
            (localStorage.getItem("themePreference") as
              | "light"
              | "dark"
              | "system"
              | null) ?? "system";
          if (pref === "system") setThemeAttribute("system");
        };
        mediaQuery.addEventListener("change", onChange);
        return () => mediaQuery?.removeEventListener("change", onChange);
      }
      return () => {};
    }

    // 1) LocalStorage first for immediate paint
    const stored =
      (localStorage.getItem("themePreference") as
        | "light"
        | "dark"
        | "system"
        | null) ?? "system";
    setThemeAttribute(stored);
    const dispose = applySystemListener(stored === "system");

    // 2) Fetch server preference if available, then persist to localStorage
    fetch("/api/settings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { theme?: "light" | "dark" | "system" };
      })
      .then((data) => {
        if (!data || !data.theme) return;
        localStorage.setItem("themePreference", data.theme);
        setThemeAttribute(data.theme);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      dispose?.();
    };
  }, []);
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      </QueryClientProvider>
      <Toaster position="top-right" richColors closeButton />
    </SessionProvider>
  );
}
