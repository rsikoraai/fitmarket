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

  // Prevent concurrent init() calls — only the latest one loads the cart.
  // isAuth is set eagerly (before bail) so isLoading resolves quickly.
  const initSeqRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const mySeq = ++initSeqRef.current;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Set auth state immediately, before the bail check.
        // Multiple concurrent init() calls all set the same value — idempotent.
        // This ensures isLoading resolves to false even if cart loading is bailed.
        setIsAuth(true);

        // Only the LATEST init() loads/merges the cart.
        if (initSeqRef.current !== mySeq) return;

        // Grab localStorage immediately (before any further awaits)
        const localIds = getLocalCart();

        if (localIds.length > 0) {
          console.log(
            `[cart] userId=${user.id} merging ${localIds.length} items:`,
            localIds
          );

          let merged: string[] = localIds; // optimistic fallback
          try {
            const mergeRes = await fetch("/api/cart/merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courseIds: localIds }),
            });

            if (mergeRes.ok) {
              const mergeData = await mergeRes.json();
              merged = mergeData.courseIds ?? [];
              console.log(`[cart] Merge success. Final cart:`, merged);
              localStorage.removeItem(STORAGE_KEY);
            } else {
              const errText = await mergeRes.text().catch(() => "");
              console.error(
                `[cart] Merge failed (${mergeRes.status}):`,
                errText
              );
              // Keep localStorage intact — next init() will retry
            }
          } catch (e) {
            console.error("[cart] Merge network error:", e);
            // Keep localStorage intact
          }

          if (initSeqRef.current !== mySeq) return;
          setCartItems(merged);
          return;
        }

        // No local items — load from DB
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
        setCartItems(dbIds);
      } else {
        // Guest — bail check still applies to avoid overwriting a concurrent
        // SIGNED_IN init() that is in-flight.
        if (initSeqRef.current !== mySeq) return;
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
        // Cancel any in-progress init() that might overwrite the cleared state
        initSeqRef.current++;
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
            console.error(
              "[cart] POST /api/cart failed:",
              res.status,
              await res.text().catch(() => "")
            );
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
