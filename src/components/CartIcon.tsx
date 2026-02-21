"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";

export function CartIcon() {
  const { cartCount } = useCart();

  return (
    <Link
      href="/koszyk"
      className="relative p-2 text-[#9ca3af] hover:text-white transition-colors"
      aria-label={`Koszyk (${cartCount})`}
    >
      <ShoppingCart className="h-5 w-5" />
      {cartCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-black leading-none">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}
