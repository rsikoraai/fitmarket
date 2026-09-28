"use client";

import { useEffect } from "react";

const STORAGE_KEY = "fitmarket_cart";

/**
 * Clears the localStorage cart on mount.
 * Used on the /koszyk/success page so that localStorage is wiped
 * after a successful payment, even if the merge race had left items there.
 */
export function CartLocalStorageClearer() {
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return null;
}
