import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CartLocalStorageClearer } from "@/components/CartLocalStorageClearer";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

async function SuccessContent({ sessionId }: { sessionId: string }) {
  // Verify session with Stripe
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch {
    redirect("/koszyk");
  }

  if (session.payment_status !== "paid") {
    redirect("/koszyk");
  }

  const userId = session.metadata?.userId;
  const courseIds: string[] = JSON.parse(session.metadata?.courseIds ?? "[]");
  const amountTotal = session.amount_total ?? 0;
  const perCourse = Math.round(amountTotal / (courseIds.length || 1));

  // Fallback: if webhook hasn't fired yet, create purchases now
  if (userId && courseIds.length > 0) {
    const existing = await prisma.purchase.findMany({
      where: { stripePaymentId: sessionId },
      select: { courseId: true },
    });
    const existingIds = new Set(existing.map((p) => p.courseId));
    const toCreate = courseIds.filter((id) => !existingIds.has(id));

    if (toCreate.length > 0) {
      await prisma.$transaction([
        prisma.purchase.createMany({
          data: toCreate.map((courseId) => ({
            clientId: userId,
            courseId,
            stripePaymentId: sessionId,
            amount: perCourse,
            status: "COMPLETED",
          })),
        }),
        prisma.cartItem.deleteMany({
          where: { clientId: userId, courseId: { in: courseIds } },
        }),
      ]);
    }
  }

  // Fetch purchased course titles for display
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true },
  });

  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-24 px-4">
      {/* Clear localStorage cart on successful payment */}
      <CartLocalStorageClearer />

      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/10">
        <CheckCircle2 className="h-10 w-10 text-[#10B981]" />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold text-white mb-2">
        Płatność zakończona!
      </h1>
      <p className="text-[#6b7280] text-sm mb-8 leading-relaxed">
        Dziękujemy za zakup. Twoje kursy są już dostępne w panelu klienta.
      </p>

      {/* Purchased courses */}
      {courses.length > 0 && (
        <div className="w-full rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-4 mb-8 text-left space-y-2">
          <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-3">
            Zakupione kursy
          </p>
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
              <span className="text-sm text-white">{c.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link
          href="/dashboard/client"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0ea570] px-6 py-3 text-sm font-semibold text-black transition-colors"
        >
          Przejdź do moich kursów
        </Link>
        <Link
          href="/"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-transparent border border-[#2a2a2a] hover:border-[#3a3a3a] px-6 py-3 text-sm font-semibold text-white transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Przeglądaj kursy
        </Link>
      </div>
    </div>
  );
}

export default async function SuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    redirect("/koszyk");
  }

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Suspense
        fallback={
          <div className="flex flex-col items-center py-24 px-4">
            <div className="h-20 w-20 rounded-full bg-[#1a1a1a] animate-pulse mb-6" />
            <div className="h-7 w-64 rounded bg-[#1a1a1a] animate-pulse mb-3" />
            <div className="h-4 w-48 rounded bg-[#1a1a1a] animate-pulse" />
          </div>
        }
      >
        <SuccessContent sessionId={sessionId} />
      </Suspense>
    </main>
  );
}
