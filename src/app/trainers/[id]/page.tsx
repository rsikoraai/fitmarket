import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: id },
    select: { displayName: true, bio: true },
  });
  if (!profile) return { title: "Trener nie znaleziony — FitMarket" };
  return {
    title: `${profile.displayName} — FitMarket`,
    description:
      profile.bio ?? `Profil trenera ${profile.displayName} na FitMarket`,
  };
}

export default async function TrainerPublicProfilePage({ params }: Props) {
  const { id } = await params;

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: id },
    include: {
      courses: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!profile) notFound();

  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            ← Wróć
          </Link>
        </div>

        {/* Profile header */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={128}
                height={128}
                className="h-32 w-32 rounded-full object-cover ring-4 ring-[#1a1a1a]"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#10B981]/20 text-[#10B981] text-3xl font-bold ring-4 ring-[#1a1a1a]">
                {initials}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {profile.displayName}
            </h1>

            {profile.specializations.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {profile.specializations.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-0.5 text-xs text-[#9ca3af]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-4 text-[#9ca3af] leading-relaxed whitespace-pre-wrap text-sm">
              {profile.bio ?? (
                <span className="italic text-[#6b7280]">
                  Trener nie dodał jeszcze opisu.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-[#1a1a1a]" />

        {/* Published courses */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">
            Kursy trenera
            {profile.courses.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[#6b7280]">
                ({profile.courses.length})
              </span>
            )}
          </h2>

          {profile.courses.length === 0 ? (
            <div className="rounded-2xl bg-[#111111] border border-[#1e1e1e] p-12 text-center">
              <p className="text-[#6b7280] text-sm">
                Ten trener nie ma jeszcze żadnych opublikowanych kursów.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/kursy/${course.id}`}
                  className="group rounded-2xl bg-[#111111] border border-[#1e1e1e] hover:border-[#2a2a2a] overflow-hidden transition-colors"
                >
                  {course.thumbnailUrl ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-[#1a1a1a] flex items-center justify-center">
                      <span className="text-[#3a3a3a] text-xs">Brak miniatury</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-white leading-snug line-clamp-2">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="mt-1 text-sm text-[#6b7280] line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-white">
                        {formatPrice(course.price)}
                      </span>
                      {course.category && (
                        <span className="rounded-full bg-[#1a1a1a] border border-[#2a2a2a] px-2.5 py-0.5 text-xs text-[#9ca3af]">
                          {course.category}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
