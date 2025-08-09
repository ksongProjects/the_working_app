import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { auth } from "@/auth/config";
import Link from "next/link";
import NavMenuButton from "@/components/NavMenuButton";
import SignOutButton from "@/components/SignOutButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "myWorkDay",
  description: "Plan your day, sync calendars, and track time with Jira.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAuthed = !!session;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ClientProviders>
          <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 backdrop-blur px-4 py-2 text-sm">
            <Link href="/" className="font-semibold">
              myWorkDay
            </Link>
            <div className="flex items-center gap-2">
              {isAuthed && <NavMenuButton />}
              {!isAuthed && (
                <Link className="rounded border px-2 py-1" href="/sign-in">
                  Sign in
                </Link>
              )}
              {isAuthed && <SignOutButton />}
            </div>
          </header>
          <main className="min-h-[calc(100vh-41px)]">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
