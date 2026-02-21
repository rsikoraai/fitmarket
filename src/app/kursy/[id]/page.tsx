import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play, FileText, Lock, Users, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { CourseActions } from "@/components/CourseActions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { title: true, description: true, category: true },
  });
  if (!course) return { title: "Kurs nie znaleziony — FitMarket" };
  return {
    title: `${course.title} — FitMarket`,
    description: course.description || `Kurs z kategorii ${course.category} na FitMarket`,
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      trainer: {
        select: {
          userId: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          specializations: true,
        },
      },
      materials: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, type: true },
      },
      _count: { select: { purchases: true } },
    },
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user ? course?.trainer.userId === user.id : false;

  if (!course || (course.status !== "PUBLISHED" && !isOwner)) {
    notFound();
  }

  let hasPurchased = false;
  let isTrainer = false;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    isTrainer = dbUser?.role === "TRAINER";

    if (!isOwner && !isTrainer) {
      const purchase = await prisma.purchase.findFirst({
        where: { clientId: user.id, courseId: id, status: "COMPLETED" },
      });
      hasPurchased = !!purchase;
    }
  }

  const materialCount = course.materials.length;

  const priceCard = (
    <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-5">
      <span className="inline-block rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-medium px-3 py-1 mb-3">
        {course.category}
      </span>
      <h1 className="text-xl font-bold text-white leading-snug mb-2">
        {course.title}
      </h1>
      <p className="text-sm text-[#6b7280] leading-relaxed mb-4 line-clamp-3">
        {course.description || "Brak opisu."}
      </p>
      <div className="flex gap-4 text-xs text-[#6b7280] mb-5">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {materialCount}{" "}
          {materialCount === 1
            ? "materiał"
            : materialCount < 5
              ? "materiały"
              : "materiałów"}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {course._count.purchases}{" "}
          {course._count.purchases === 1 ? "uczeń" : "uczniów"}
        </span>
      </div>
      <p className="text-3xl font-bold text-white mb-5">
        {formatPrice(course.price)}
      </p>
      <CourseActions
        courseId={course.id}
        hasPurchased={hasPurchased}
        isOwner={isOwner}
        isTrainer={isTrainer}
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        {/* Back button */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            ← Wróć do kursów
          </Link>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6 flex-wrap">
          <Link href="/" className="hover:text-white transition-colors">
            Strona główna
          </Link>
          <span>/</span>
          <Link
            href={`/?category=${encodeURIComponent(course.category)}`}
            className="hover:text-white transition-colors"
          >
            {course.category}
          </Link>
          <span>/</span>
          <span className="text-white truncate max-w-[240px]">
            {course.title}
          </span>
        </nav>

        {/* Main grid — left (thumbnail + content) | right (sticky price card) */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8">
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Thumbnail */}
            <div className="lg:col-start-1 lg:row-start-1 relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] mb-6">
              {course.thumbnailUrl ? (
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                    <Play className="h-8 w-8 text-[#6b7280]" />
                  </div>
                </div>
              )}
              {isOwner && course.status === "DRAFT" && (
                <span className="absolute top-3 left-3 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs px-3 py-1">
                  Szkic — niewidoczny publicznie
                </span>
              )}
            </div>

            {/* Mobile-only price card (appears right after thumbnail) */}
            <div className="lg:hidden mb-8">{priceCard}</div>

            {/* Description */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">
                O kursie
              </h2>
              <p className="text-[#9ca3af] leading-relaxed whitespace-pre-line">
                {course.description || "Brak opisu."}
              </p>
            </section>

            {/* Materials */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">
                Zawartość kursu{" "}
                <span className="text-[#6b7280] text-sm font-normal">
                  ({materialCount}{" "}
                  {materialCount === 1
                    ? "materiał"
                    : materialCount < 5
                      ? "materiały"
                      : "materiałów"}
                  )
                </span>
              </h2>
              {materialCount > 0 ? (
                <ul className="space-y-2">
                  {course.materials.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3"
                    >
                      {m.type === "VIDEO" ? (
                        <Play className="h-4 w-4 text-[#10B981] shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-[#6b7280] shrink-0" />
                      )}
                      <span className="text-sm text-white flex-1 min-w-0 truncate">
                        {m.title}
                      </span>
                      <span className="text-xs text-[#6b7280] shrink-0">
                        {m.type === "VIDEO" ? "Wideo" : "PDF"}
                      </span>
                      <Lock className="h-3.5 w-3.5 text-[#3a3a3a] shrink-0" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#6b7280]">
                  Brak materiałów w tym kursie.
                </p>
              )}
            </section>

            {/* Trainer */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">
                Twój trener
              </h2>
              <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-5">
                <div className="flex items-start gap-4">
                  {course.trainer.avatarUrl ? (
                    <Image
                      src={course.trainer.avatarUrl}
                      alt={course.trainer.displayName}
                      width={56}
                      height={56}
                      className="rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0">
                      <span className="text-xl text-[#6b7280]">
                        {course.trainer.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/trainers/${course.trainer.userId}`}
                      className="text-base font-semibold text-white hover:text-[#10B981] transition-colors"
                    >
                      {course.trainer.displayName}
                    </Link>
                    {course.trainer.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {course.trainer.specializations.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[#2a2a2a] px-2.5 py-0.5 text-xs text-[#9ca3af]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {course.trainer.bio && (
                      <p className="mt-2 text-sm text-[#6b7280] leading-relaxed line-clamp-3">
                        {course.trainer.bio}
                      </p>
                    )}
                    <Link
                      href={`/trainers/${course.trainer.userId}`}
                      className="mt-2 inline-flex text-xs text-[#10B981] hover:underline"
                    >
                      Zobacz profil trenera →
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN (desktop sticky) ── */}
          <div className="hidden lg:block">
            <div className="sticky top-20">{priceCard}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
