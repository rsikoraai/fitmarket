"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, ArrowRight, X, User, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface CourseItem {
  id: string;
  title: string;
  price: number;
  category: string;
  thumbnailUrl: string | null;
  trainer: {
    displayName: string;
    avatarUrl: string | null;
  };
}

export default function CartPage() {
  const { cartItems, removeFromCart, cartCount, isLoading: cartLoading } =
    useCart();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch course details when cart changes
  const cartKey = cartItems.join(",");
  useEffect(() => {
    if (cartLoading) return;
    if (!cartItems.length) {
      setCourses([]);
      return;
    }

    setCoursesLoading(true);
    const params = new URLSearchParams();
    cartItems.forEach((id) => params.append("ids", id));

    fetch(`/api/courses/batch?${params}`)
      .then((r) => r.json())
      .then((data) => {
        // Preserve the order from cart
        const courseMap = new Map(
          (data.courses as CourseItem[]).map((c) => [c.id, c])
        );
        const ordered = cartItems
          .map((id) => courseMap.get(id))
          .filter(Boolean) as CourseItem[];
        setCourses(ordered);
        setCoursesLoading(false);
      })
      .catch(() => setCoursesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, cartLoading]);

  const total = courses.reduce((sum, c) => sum + c.price, 0);
  const isPageLoading =
    cartLoading || (cartItems.length > 0 && coursesLoading);

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Nie można połączyć się z serwerem płatności.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────
  if (isPageLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl px-4 md:px-6 py-8">
          <div className="h-8 w-32 bg-[#1a1a1a] rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-[#1a1a1a] animate-pulse"
                />
              ))}
            </div>
            <div className="h-48 rounded-xl bg-[#1a1a1a] animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  // ── Empty ─────────────────────────────────────────────────
  if (!cartItems.length) {
    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl px-4 md:px-6 py-8">
          <h1 className="text-2xl font-bold text-white mb-8">Koszyk</h1>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 h-16 w-16 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-[#3a3a3a]" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">
              Twój koszyk jest pusty
            </h2>
            <p className="text-[#6b7280] text-sm mb-6 max-w-xs">
              Dodaj kursy, które Cię interesują i wróć tutaj, aby zapłacić.
            </p>
            <Link
              href="/"
              className="rounded-full bg-[#10B981] hover:bg-[#0ea570] px-6 py-2.5 text-sm font-semibold text-black transition-colors"
            >
              Przeglądaj kursy →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Filled ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">
          Koszyk{" "}
          <span className="text-[#6b7280] text-base font-normal">
            ({cartCount}{" "}
            {cartCount === 1
              ? "kurs"
              : cartCount < 5
                ? "kursy"
                : "kursów"}
            )
          </span>
        </h1>

        {/* Checkout error */}
        {checkoutError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
            <span className="text-red-400 text-sm">{checkoutError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:items-start">
          {/* ── Items list ── */}
          <ul className="space-y-3">
            {courses.map((course) => (
              <li
                key={course.id}
                className="flex items-center gap-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-4 hover:border-[#3a3a3a] transition-colors"
              >
                {/* Thumbnail */}
                <Link href={`/kursy/${course.id}`} className="shrink-0">
                  <div className="relative h-16 w-[100px] rounded-lg overflow-hidden bg-[#2a2a2a]">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-[#3a3a3a]" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#10B981] block mb-0.5">
                    {course.category}
                  </span>
                  <Link href={`/kursy/${course.id}`}>
                    <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 hover:text-[#10B981] transition-colors">
                      {course.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {course.trainer.avatarUrl ? (
                      <Image
                        src={course.trainer.avatarUrl}
                        alt={course.trainer.displayName}
                        width={16}
                        height={16}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                        <User className="h-2.5 w-2.5 text-[#6b7280]" />
                      </div>
                    )}
                    <span className="text-xs text-[#6b7280]">
                      {course.trainer.displayName}
                    </span>
                  </div>
                </div>

                {/* Price + Remove */}
                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-base font-bold text-white">
                    {formatPrice(course.price)}
                  </span>
                  <button
                    onClick={() => removeFromCart(course.id)}
                    className="p-1.5 rounded-lg text-[#6b7280] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label="Usuń z koszyka"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* ── Summary sidebar ── */}
          <div className="lg:sticky lg:top-20">
            <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-5">
              <h2 className="text-base font-semibold text-white mb-4">
                Podsumowanie
              </h2>

              {/* Line items */}
              <div className="space-y-2 mb-4">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span className="text-[#6b7280] truncate flex-1">
                      {c.title}
                    </span>
                    <span className="text-[#9ca3af] shrink-0">
                      {formatPrice(c.price)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-[#2a2a2a] pt-4 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6b7280]">Razem</span>
                  <span className="text-xl font-bold text-white">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#10B981] hover:bg-[#0ea570] active:bg-[#059669] disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-black transition-colors"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Przekierowuję…
                  </>
                ) : (
                  <>
                    Przejdź do płatności
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <Link
                href="/"
                className="mt-3 flex items-center justify-center text-xs text-[#6b7280] hover:text-white transition-colors"
              >
                ← Kontynuuj zakupy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Auth modal ── */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowAuthModal(false)
          }
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white leading-snug">
                Zaloguj się, aby kontynuować
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="ml-3 shrink-0 p-1 text-[#6b7280] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[#6b7280] mb-6 leading-relaxed">
              Po zalogowaniu koszyk zostanie automatycznie przeniesiony na Twoje
              konto.
            </p>

            <div className="space-y-3">
              <Link
                href="/login?redirectTo=/koszyk"
                onClick={() => setShowAuthModal(false)}
                className="flex items-center justify-center w-full rounded-xl bg-[#10B981] hover:bg-[#0ea570] px-6 py-3 text-sm font-semibold text-black transition-colors"
              >
                Mam konto — Zaloguj się
              </Link>
              <Link
                href="/register?redirectTo=/koszyk"
                onClick={() => setShowAuthModal(false)}
                className="flex items-center justify-center w-full rounded-xl bg-transparent border border-[#2a2a2a] hover:border-[#10B981] px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                Nie mam konta — Zarejestruj się
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
