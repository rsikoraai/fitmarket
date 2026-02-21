"use client";

import { useSearchParams, useRouter } from "next/navigation";

const CATEGORIES = [
  { label: "Wszystkie", value: "" },
  { label: "Siłownia", value: "Siłownia" },
  { label: "Cardio", value: "Cardio" },
  { label: "Joga", value: "Joga" },
  { label: "Pilates", value: "Pilates" },
  { label: "Żywienie", value: "Żywienie" },
  { label: "Boks", value: "Boks" },
  { label: "Crossfit", value: "Crossfit" },
  { label: "Stretching", value: "Stretching" },
  { label: "Inne", value: "Inne" },
];

const SORT_OPTIONS = [
  { label: "Najnowsze", value: "newest" },
  { label: "Najtańsze", value: "cheapest" },
  { label: "Najpopularniejsze", value: "popular" },
];

export function CategoryFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCategory = searchParams.get("category") ?? "";
  const activeSort = searchParams.get("sort") ?? "newest";

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Category buttons — scrollable horizontally on mobile */}
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setParam("category", cat.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? "bg-[#10B981] text-black"
                : "bg-[#1a1a1a] text-[#d1d5db] border border-[#2a2a2a] hover:border-[#10B981] hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[#6b7280]">Sortuj:</span>
        <div className="flex gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParam("sort", opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeSort === opt.value
                  ? "border border-[#10B981] text-[#10B981] bg-[#10B981]/10"
                  : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#6b7280] hover:text-white hover:border-[#3a3a3a]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
