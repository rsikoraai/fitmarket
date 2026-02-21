import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default async function TrainerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      trainerProfile: {
        include: {
          courses: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
              _count: { select: { materials: true } },
            },
          },
          _count: { select: { courses: true } },
        },
      },
    },
  });

  if (!dbUser || dbUser.role !== "TRAINER") redirect("/dashboard/client");

  const profile = dbUser.trainerProfile;

  // Revenue + sales from completed purchases
  const revenueData = await prisma.purchase.aggregate({
    where: {
      course: { trainer: { userId: user.id } },
      status: "COMPLETED",
    },
    _sum: { amount: true },
    _count: true,
  });

  const totalRevenue = revenueData._sum.amount ?? 0;
  const totalSales = revenueData._count;
  const totalCourses = profile?._count.courses ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile?.displayName ?? ""}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {(profile?.displayName ?? dbUser.email)[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">Panel trenera</h1>
              <p className="text-sm text-muted-foreground">
                Witaj, {profile?.displayName ?? dbUser.email}!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/trainer/profile">Edytuj profil</Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Wyloguj się
              </Button>
            </form>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#111] border border-[#1e1e1e] p-6">
            <p className="text-sm text-[#6b7280]">Kursy</p>
            <p className="text-3xl font-bold text-white">{totalCourses}</p>
          </div>
          <div className="rounded-xl bg-[#111] border border-[#1e1e1e] p-6">
            <p className="text-sm text-[#6b7280]">Sprzedaże</p>
            <p className="text-3xl font-bold text-white">{totalSales}</p>
          </div>
          <div className="rounded-xl bg-[#111] border border-[#1e1e1e] p-6">
            <p className="text-sm text-[#6b7280]">Przychód</p>
            <p className="text-3xl font-bold text-white">{formatPrice(totalRevenue)}</p>
          </div>
        </div>

        {/* Recent courses */}
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Ostatnie kursy</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/trainer/courses">Wszystkie kursy</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/trainer/courses/new">+ Nowy kurs</Link>
              </Button>
            </div>
          </div>

          {!profile?.courses.length ? (
            <div className="rounded-xl bg-[#111] border border-[#1e1e1e] p-10 text-center">
              <p className="mb-3 text-[#6b7280]">Nie masz jeszcze żadnych kursów.</p>
              <Button asChild>
                <Link href="/dashboard/trainer/courses/new">
                  Utwórz pierwszy kurs
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 rounded-xl bg-[#111] border border-[#1e1e1e] p-4 hover:border-[#2a2a2a] transition-colors"
                >
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-12 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-xs text-[#6b7280]">
                      Brak
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{course.title}</span>
                      <Badge
                        variant={
                          course.status === "PUBLISHED"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {course.status === "PUBLISHED"
                          ? "Opublikowany"
                          : "Szkic"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[#6b7280]">
                      {formatPrice(course.price)} ·{" "}
                      {course._count.materials} materiałów
                    </p>
                  </div>

                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/dashboard/trainer/courses/${course.id}/edit`}
                    >
                      Edytuj
                    </Link>
                  </Button>
                </div>
              ))}

              {totalCourses > 3 && (
                <p className="pt-1 text-center text-sm text-[#6b7280]">
                  i {totalCourses - 3} więcej —{" "}
                  <Link
                    href="/dashboard/trainer/courses"
                    className="text-[#10B981] underline underline-offset-4"
                  >
                    pokaż wszystkie
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Profile completeness hint */}
        {(!profile?.bio || !profile?.avatarUrl) && (
          <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/20 p-4 text-sm">
            <span className="font-medium">Uzupełnij profil</span> — dodaj
            zdjęcie i bio, aby klienci mogli Cię lepiej poznać.{" "}
            <Link
              href="/dashboard/trainer/profile"
              className="text-[#10B981] underline underline-offset-4"
            >
              Edytuj profil →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
