import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Zaloguj się — FitMarket",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-md rounded-2xl bg-[#111111] border border-[#2a2a2a] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Zaloguj się</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Wejdź na swoje konto FitMarket
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
