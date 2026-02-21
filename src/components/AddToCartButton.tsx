"use client";

import Link from "next/link";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface AddToCartButtonProps {
  courseId: string;
  variant?: "card" | "full";
}

export function AddToCartButton({
  courseId,
  variant = "card",
}: AddToCartButtonProps) {
  const { isInCart, addToCart, isLoading } = useCart();
  const inCart = isInCart(courseId);

  if (isLoading) {
    if (variant === "card") {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#6b7280]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Ładowanie...
        </div>
      );
    }
    return (
      <div className="h-11 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] animate-pulse" />
    );
  }

  if (inCart) {
    if (variant === "card") {
      return (
        <Link
          href="/koszyk"
          className="flex items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[#10B981] px-3 py-1.5 text-xs font-semibold text-[#10B981] hover:bg-[#10B981]/10 transition-colors"
        >
          <Check className="h-3 w-3" />
          W koszyku
        </Link>
      );
    }
    return (
      <Link
        href="/koszyk"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#10B981] px-6 py-3 text-sm font-semibold text-[#10B981] hover:bg-[#10B981]/10 transition-colors w-full"
      >
        <Check className="h-4 w-4" />
        W koszyku — Przejdź do koszyka →
      </Link>
    );
  }

  if (variant === "card") {
    return (
      <button
        onClick={() => addToCart(courseId)}
        className="flex items-center gap-1.5 rounded-full bg-[#10B981] hover:bg-[#0ea570] active:bg-[#059669] px-3 py-1.5 text-xs font-semibold text-black transition-colors"
      >
        <ShoppingCart className="h-3 w-3" />
        Dodaj do koszyka
      </button>
    );
  }

  return (
    <button
      onClick={() => addToCart(courseId)}
      className="flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0ea570] active:bg-[#059669] px-6 py-3 text-sm font-semibold text-black transition-colors w-full"
    >
      <ShoppingCart className="h-4 w-4" />
      Dodaj do koszyka
    </button>
  );
}
