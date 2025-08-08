"use client";
import Image from "next/image";
import { Dialog } from "@base-ui-components/react/dialog";
import { toast } from "sonner";
import { useCallback, useState } from "react";

export default function Home() {
  const [open, setOpen] = useState(false);
  const showToast = useCallback(() => {
    toast.success("Your scaffold is ready.", {
      description: "Hello from Sonner",
    });
  }, []);
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
              src/app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>

        <div className="flex gap-3">
          <button
            onClick={showToast}
            className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          >
            Show toast
          </button>
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Open dialog
          </button>
        </div>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger style={{ display: "none" }} />
          <Dialog.Portal>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <Dialog.Popup className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg outline-none dark:bg-neutral-900 dark:text-white">
                <Dialog.Title className="text-lg font-semibold">
                  Base UI Dialog
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm opacity-80">
                  This dialog is rendered with Base UI primitives.
                </Dialog.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <Dialog.Close className="rounded-md border px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    Close
                  </Dialog.Close>
                </div>
              </Dialog.Popup>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
