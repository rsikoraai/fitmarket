import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/components/SearchBar";
import { CartIcon } from "@/components/CartIcon";
import { MobileNavMenu } from "@/components/MobileNavMenu";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isTrainer = false;
  let displayName: string | undefined;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        trainerProfile: { select: { displayName: true } },
      },
    });

    isTrainer = dbUser?.role === "TRAINER";

    if (isTrainer && dbUser?.trainerProfile?.displayName) {
      displayName = dbUser.trainerProfile.displayName;
    } else {
      displayName = user.email?.split("@")[0];
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#111111] border-b border-[#2a2a2a]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center gap-4">
        {/* Logo — always visible */}
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight">
          <span className="text-white">Fit</span>
          <span className="text-[#10B981]">Market</span>
        </Link>

        {/* Search bar — hidden on mobile */}
        <div className="hidden md:flex flex-1 justify-center">
          <Suspense
            fallback={
              <div className="h-9 w-full max-w-xl rounded-full bg-[#1a1a1a] border border-[#2a2a2a]" />
            }
          >
            <SearchBar />
          </Suspense>
        </div>

        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="shrink-0 flex items-center gap-1">
          {/* Cart — only for guests and clients, not trainers */}
          {!isTrainer && <CartIcon />}

          {/* Desktop auth links */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-[#6b7280]">
                  Witaj,{" "}
                  <span className="text-[#9ca3af]">{displayName}</span>
                </span>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-1.5 text-sm text-white hover:border-[#10B981] transition-colors"
                >
                  Panel
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-1.5 text-sm text-[#9ca3af] hover:text-white transition-colors"
                >
                  Zaloguj
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#10B981] px-4 py-1.5 text-sm font-semibold text-black hover:bg-[#0ea570] transition-colors"
                >
                  Zarejestruj
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <MobileNavMenu isLoggedIn={!!user} displayName={displayName} />
        </div>
      </div>
    </header>
  );
}
