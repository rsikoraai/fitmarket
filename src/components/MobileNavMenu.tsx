"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

interface Props {
  isLoggedIn: boolean;
}

export function MobileNavMenu({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Zamknij menu" : "Otwórz menu"}
        className="p-2 text-[#9ca3af] hover:text-white transition-colors"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#111111] border border-[#2a2a2a] shadow-2xl p-4 space-y-4 z-50">
            <Suspense
              fallback={
                <div className="h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]" />
              }
            >
              <SearchBar />
            </Suspense>

            <div className="border-t border-[#2a2a2a] pt-3 space-y-2">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center rounded-full bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2.5 text-sm text-white hover:border-[#10B981] transition-colors"
                >
                  Panel
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center py-2.5 text-sm text-[#9ca3af] hover:text-white transition-colors"
                  >
                    Zaloguj się
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center rounded-full bg-[#10B981] hover:bg-[#0ea570] px-4 py-2.5 text-sm font-semibold text-black transition-colors"
                  >
                    Zarejestruj się
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
