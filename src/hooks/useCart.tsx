"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
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

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsAuth(true);

        // Fetch DB cart
        let dbIds: string[] = [];
        try {
          const res = await fetch("/api/cart");
          if (res.ok) {
            const data = await res.json();
            dbIds = data.courseIds ?? [];
          }
        } catch {
          // network error — proceed with empty DB cart
        }

        // Merge localStorage items into DB if any
        const localIds = getLocalCart();
        if (localIds.length > 0) {
          const mergeRes = await fetch("/api/cart/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseIds: localIds }),
          });
          localStorage.removeItem(STORAGE_KEY);
          if (mergeRes.ok) {
            const mergeData = await mergeRes.json();
            setCartItems(mergeData.courseIds ?? []);
          } else {
            setCartItems([...new Set([...dbIds, ...localIds])]);
          }
        } else {
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
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        if (res.ok) {
          setCartItems((prev) =>
            prev.includes(courseId) ? prev : [...prev, courseId]
          );
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
      // Optimistic update
      setCartItems((prev) => prev.filter((id) => id !== courseId));

      if (isAuth) {
        await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
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
