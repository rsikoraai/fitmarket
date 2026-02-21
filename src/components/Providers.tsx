"use client";

import { type ReactNode } from "react";
import { CartProvider } from "@/hooks/useCart";

export function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
