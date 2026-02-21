"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export function SearchBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Szukaj kursów..."
        className="w-full rounded-full bg-[#1a1a1a] border border-[#2a2a2a] pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#10B981] transition-colors"
      />
    </form>
  );
}
