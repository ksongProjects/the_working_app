"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";

export default function NavMenuButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded border px-2 py-1 inline-flex items-center gap-1"
      >
        <Menu size={16} />
        Menu
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded border bg-background p-1 text-sm shadow-md">
          <Link
            className="block rounded px-2 py-1 hover:bg-neutral-100"
            href="/dashboard"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            className="block rounded px-2 py-1 hover:bg-neutral-100"
            href="/settings"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
