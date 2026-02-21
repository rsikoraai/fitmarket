import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle, FileText, ShoppingBag, LogOut } from "lucide-react";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, role: true },
  });

  if (!dbUser || dbUser.role !== "CLIENT") redirect("/dashboard/trainer");

  const purchases = await prisma.purchase.findMany({
    where: { clientId: user.id, status: "COMPLETED" },
    include: {
      course: {
        include: {
          trainer: { select: { displayName: true } },
          _count: { select: { materials: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-16 z-10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Moje kursy</h1>
            <p className="text-xs text-[#6b7280]">{dbUser.email}</p>
          </div>
          <form action={logoutAction}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-[#6b7280] hover:text-white gap-2"
            >
              <LogOut className="h-4 w-4" />
              Wyloguj
            </Button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {purchases.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1a1a1a]">
              <BookOpen className="h-9 w-9 text-[#6b7280]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Nie masz jeszcze żadnych kursów
            </h2>
            <p className="text-sm text-[#6b7280] mb-6 max-w-sm">
              Przeglądaj naszą ofertę i kup swój pierwszy kurs fitness.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0ea570] px-5 py-2.5 text-sm font-semibold text-black transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Przeglądaj kursy
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#6b7280] mb-6">
              {purchases.length === 1
                ? "1 kurs"
                : `${purchases.length} kursów`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {purchases.map(({ course, createdAt }) => (
                <Link
                  key={course.id}
                  href={`/dashboard/client/kursy/${course.id}`}
                  className="group flex flex-col rounded-2xl bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] overflow-hidden transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 bg-[#1a1a1a]">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="h-12 w-12 text-[#2a2a2a]" />
                      </div>
                    )}
                    {/* Category badge */}
                    <span className="absolute top-3 left-3 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-0.5 text-xs text-[#9ca3af]">
                      {course.category}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 p-4">
                    <h3 className="font-semibold text-white text-sm leading-snug mb-1 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-[#6b7280] mb-3">
                      {course.trainer.displayName}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                        <FileText className="h-3.5 w-3.5" />
                        {course._count.materials} materiałów
                      </div>
                      <span className="text-xs text-[#6b7280]">
                        {new Date(createdAt).toLocaleDateString("pl-PL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-4 pb-4">
                    <div className="w-full rounded-lg bg-[#10B981]/10 text-[#10B981] text-xs font-medium py-2 text-center group-hover:bg-[#10B981]/20 transition-colors">
                      Otwórz kurs →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
