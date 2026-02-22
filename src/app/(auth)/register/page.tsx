import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Utwórz konto — FitMarket",
};

interface Props {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;
  const safeRedirect =
    typeof redirectTo === "string" &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//")
      ? redirectTo
      : undefined;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-md rounded-2xl bg-[#111111] border border-[#2a2a2a] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Utwórz konto</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Dołącz do FitMarket jako klient lub trener
          </p>
        </div>
        <RegisterForm redirectTo={safeRedirect} />
      </div>
    </div>
  );
}
