import Link from "next/link";
import { auth } from "@/auth/config";
import { redirect } from "next/navigation";
import { Calendar, Clock, Plug, TicketCheck } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const isAuthed = !!session;
  if (isAuthed) return redirect("/dashboard");
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <section className="text-center">
        <h1 className="text-3xl font-semibold">myWorkDay</h1>
        <p className="mt-2 text-sm opacity-80">
          Plan your day, track time, and sync with Google/Outlook calendars and
          Jira.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isAuthed ? (
            <>
              <Link href="/dashboard" className="rounded border px-4 py-2">
                Dashboard
              </Link>
              <Link
                href="/settings/connections"
                className="rounded border px-4 py-2"
              >
                Connections
              </Link>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Get started
            </Link>
          )}
        </div>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded border p-5">
          <div className="flex items-center gap-2">
            <TicketCheck size={18} />
            <h2 className="font-medium">Focus Today</h2>
          </div>
          <p className="mt-1 text-sm opacity-80">
            Pick key Jira issues to focus on, start/stop timers, and push
            worklogs.
          </p>
        </div>
        <div className="rounded border p-5">
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <h2 className="font-medium">Plan Schedule</h2>
          </div>
          <p className="mt-1 text-sm opacity-80">
            Create day blocks and mirror them to Google or Outlook calendars.
          </p>
        </div>
        <div className="rounded border p-5">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <h2 className="font-medium">Track Time</h2>
          </div>
          <p className="mt-1 text-sm opacity-80">
            Start/stop timers and optionally auto-push Jira worklogs.
          </p>
        </div>
        <div className="rounded border p-5">
          <div className="flex items-center gap-2">
            <Plug size={18} />
            <h2 className="font-medium">Manage Connections</h2>
          </div>
          <p className="mt-1 text-sm opacity-80">
            Link Google, Microsoft, and Atlassian accounts securely.
          </p>
        </div>
      </section>
    </main>
  );
}
