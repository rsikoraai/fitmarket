import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default async function TrainerCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    include: {
      courses: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { materials: true, purchases: true } },
        },
      },
    },
  });

  if (!profile) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <nav className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/dashboard/trainer"
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground">Moje kursy</span>
            </nav>
            <h1 className="text-2xl font-bold">
              Moje kursy
              {profile.courses.length > 0 && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  ({profile.courses.length})
                </span>
              )}
            </h1>
          </div>
          <Button asChild>
            <Link href="/dashboard/trainer/courses/new">+ Nowy kurs</Link>
          </Button>
        </div>

        {/* Empty state */}
        {profile.courses.length === 0 ? (
          <div className="rounded-lg border p-16 text-center">
            <p className="mb-2 font-medium">Brak kursów</p>
            <p className="mb-6 text-sm text-muted-foreground">
              Utwórz pierwszy kurs i zacznij zarabiać.
            </p>
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
                className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Thumbnail */}
                {course.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-14 w-24 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                    Brak
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{course.title}</span>
                    <Badge
                      variant={
                        course.status === "PUBLISHED" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {course.status === "PUBLISHED"
                        ? "Opublikowany"
                        : "Szkic"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{formatPrice(course.price)}</span>
                    <span>·</span>
                    <span>{course._count.materials} materiałów</span>
                    <span>·</span>
                    <span>{course._count.purchases} sprzedaży</span>
                    {course.category && (
                      <>
                        <span>·</span>
                        <span>{course.category}</span>
                      </>
                    )}
                  </div>
                </div>

                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={`/dashboard/trainer/courses/${course.id}/edit`}>
                    Edytuj
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
