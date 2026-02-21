import { Suspense } from "react";
import { Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CourseCard } from "@/components/CourseCard";
import { CategoryFilter } from "@/components/CategoryFilter";

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const category = params.category ?? "";
  const sort = params.sort ?? "newest";

  // Fetch courses + user role in parallel
  const supabase = await createClient();
  const [
    courses,
    {
      data: { user },
    },
  ] = await Promise.all([
    prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy:
        sort === "cheapest"
          ? { price: "asc" }
          : sort === "popular"
            ? { purchases: { _count: "desc" } }
            : { createdAt: "desc" },
      include: {
        trainer: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    supabase.auth.getUser(),
  ]);

  let isTrainer = false;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    isTrainer = dbUser?.role === "TRAINER";
  }

  const count = courses.length;
  const countLabel =
    count === 0
      ? "Brak kursów"
      : count === 1
        ? "1 kurs"
        : count < 5
          ? `${count} kursy`
          : `${count} kursów`;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#111111] to-[#0a0a0a] pt-12 pb-8 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Kursy fitness{" "}
            <span className="text-[#10B981]">online</span>
          </h1>
          <p className="text-[#6b7280] text-base">
            Ucz się od najlepszych trenerów — w swoim tempie, z dowolnego
            miejsca.
          </p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3">
          <Suspense fallback={null}>
            <CategoryFilter />
          </Suspense>
        </div>
      </div>

      {/* Course grid */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <p className="text-sm text-[#6b7280] mb-6">
          {countLabel}
          {query && (
            <>
              {" "}dla &quot;<span className="text-white">{query}</span>&quot;
            </>
          )}
        </p>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} isTrainer={isTrainer} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <Layers className="h-8 w-8 text-[#3a3a3a]" />
            </div>
            <h3 className="text-white font-semibold mb-1">Brak kursów</h3>
            <p className="text-[#6b7280] text-sm max-w-xs">
              {query || category
                ? "Spróbuj zmienić filtry lub wpisać inne słowo kluczowe."
                : "Wkrótce pojawią się pierwsze kursy."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
