"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "fitmarket_cart";

function getLocalCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

interface CartContextValue {
  cartItems: string[];
  addToCart: (courseId: string) => Promise<void>;
  removeFromCart: (courseId: string) => Promise<void>;
  isInCart: (courseId: string) => boolean;
  cartCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  // Prevent concurrent init() calls — only the latest one applies its result
  const initSeqRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const mySeq = ++initSeqRef.current;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Bail if a newer init() has started
      if (initSeqRef.current !== mySeq) return;

      if (user) {
        setIsAuth(true);

        // 1. Fetch current DB cart
        let dbIds: string[] = [];
        try {
          const res = await fetch("/api/cart");
          if (res.ok) {
            const data = await res.json();
            dbIds = data.courseIds ?? [];
          } else {
            console.error("[cart] GET /api/cart failed:", res.status);
          }
        } catch (e) {
          console.error("[cart] GET /api/cart network error:", e);
        }

        if (initSeqRef.current !== mySeq) return;

        // 2. Merge localStorage → DB if anything pending
        const localIds = getLocalCart();
        if (localIds.length > 0) {
          console.log(`[cart] Merging ${localIds.length} local items to DB:`, localIds);

          let merged: string[] = [];
          try {
            const mergeRes = await fetch("/api/cart/merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courseIds: localIds }),
            });

            localStorage.removeItem(STORAGE_KEY);

            if (mergeRes.ok) {
              const mergeData = await mergeRes.json();
              merged = mergeData.courseIds ?? [];
              console.log(`[cart] Merge success. DB cart:`, merged);
            } else {
              const errText = await mergeRes.text().catch(() => "");
              console.error(`[cart] Merge failed (${mergeRes.status}):`, errText);
              // Merge failed — use DB state only (accurate, not misleading)
              merged = dbIds;
            }
          } catch (e) {
            console.error("[cart] Merge network error:", e);
            localStorage.removeItem(STORAGE_KEY);
            merged = dbIds;
          }

          if (initSeqRef.current !== mySeq) return;
          setCartItems(merged);
        } else {
          if (initSeqRef.current !== mySeq) return;
          setCartItems(dbIds);
        }
      } else {
        setIsAuth(false);
        setCartItems(getLocalCart());
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        init();
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem(STORAGE_KEY);
        setCartItems([]);
        setIsAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addToCart = useCallback(
    async (courseId: string) => {
      if (isAuth) {
        try {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId }),
          });
          if (res.ok) {
            setCartItems((prev) =>
              prev.includes(courseId) ? prev : [...prev, courseId]
            );
          } else {
            console.error("[cart] POST /api/cart failed:", res.status, await res.text().catch(() => ""));
          }
        } catch (e) {
          console.error("[cart] POST /api/cart network error:", e);
        }
      } else {
        const current = getLocalCart();
        if (!current.includes(courseId)) {
          const updated = [...current, courseId];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          setCartItems(updated);
        }
      }
    },
    [isAuth]
  );

  const removeFromCart = useCallback(
    async (courseId: string) => {
      setCartItems((prev) => prev.filter((id) => id !== courseId));

      if (isAuth) {
        await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        }).catch((e) => console.error("[cart] DELETE /api/cart error:", e));
      } else {
        const updated = getLocalCart().filter((id) => id !== courseId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    },
    [isAuth]
  );

  const isInCart = useCallback(
    (courseId: string) => cartItems.includes(courseId),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        isInCart,
        cartCount: cartItems.length,
        isLoading: isAuth === null,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
