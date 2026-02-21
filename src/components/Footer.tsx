import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm text-[#6b7280]">
          © 2025{" "}
          <span className="text-white font-medium">
            Fit<span className="text-[#10B981]">Market</span>
          </span>
        </span>
        <nav className="flex gap-6">
          <Link
            href="/"
            className="text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            Strona główna
          </Link>
          <Link
            href="/?sort=newest"
            className="text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            Kursy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
