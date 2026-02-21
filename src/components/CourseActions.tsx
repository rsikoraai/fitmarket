"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, BookOpen, Pencil, Lock } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface CourseActionsProps {
  courseId: string;
  hasPurchased: boolean;
  isOwner: boolean;
  isTrainer: boolean;
}

export function CourseActions({
  courseId,
  hasPurchased,
  isOwner,
  isTrainer,
}: CourseActionsProps) {
  const router = useRouter();
  const { isInCart, addToCart, isLoading } = useCart();
  const inCart = isInCart(courseId);

  // Owner — edit button
  if (isOwner) {
    return (
      <Link
        href={`/dashboard/trainer/courses/${courseId}/edit`}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#10B981] px-6 py-3 text-sm font-semibold text-white transition-colors w-full"
      >
        <Pencil className="h-4 w-4" />
        Edytuj kurs
      </Link>
    );
  }

  // Trainer viewing someone else's course — cannot purchase
  if (isTrainer) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 text-sm text-[#6b7280]">
        <Lock className="h-4 w-4 shrink-0" />
        Konto trenera nie może kupować kursów. Zaloguj się jako klient.
      </div>
    );
  }

  // Already purchased
  if (hasPurchased) {
    return (
      <Link
        href={`/dashboard/client/kursy/${courseId}`}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0ea570] px-6 py-3 text-sm font-semibold text-black transition-colors w-full"
      >
        <BookOpen className="h-4 w-4" />
        Przejdź do kursu
      </Link>
    );
  }

  // Loading cart state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-11 rounded-xl bg-[#2a2a2a] animate-pulse" />
        <div className="h-11 rounded-xl bg-[#2a2a2a] animate-pulse opacity-60" />
      </div>
    );
  }

  // In cart
  if (inCart) {
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

  const handleBuyNow = async () => {
    await addToCart(courseId);
    router.push("/koszyk");
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => addToCart(courseId)}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0ea570] active:bg-[#059669] px-6 py-3 text-sm font-semibold text-black transition-colors w-full"
      >
        <ShoppingCart className="h-4 w-4" />
        Dodaj do koszyka
      </button>
      <button
        onClick={handleBuyNow}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#10B981] px-6 py-3 text-sm font-semibold text-white transition-colors w-full"
      >
        Kup teraz
      </button>
    </div>
  );
}
