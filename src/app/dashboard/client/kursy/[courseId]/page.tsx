import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, FileText, Download, LogOut } from "lucide-react";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function ClientCoursePage({ params }: Props) {
  const { courseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify purchase
  const purchase = await prisma.purchase.findFirst({
    where: { clientId: user.id, courseId, status: "COMPLETED" },
  });

  if (!purchase) redirect("/dashboard/client");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      trainer: { select: { displayName: true, userId: true } },
      materials: { orderBy: { position: "asc" } },
    },
  });

  if (!course) notFound();

  // Generate signed URLs for all materials (1 hour)
  const materialsWithUrls = await Promise.all(
    course.materials.map(async (mat) => {
      const { data } = await supabase.storage
        .from("course-materials")
        .createSignedUrl(mat.fileUrl, 3600);
      return { ...mat, signedUrl: data?.signedUrl ?? null };
    })
  );

  const videos = materialsWithUrls.filter((m) => m.type === "VIDEO");
  const pdfs = materialsWithUrls.filter((m) => m.type === "PDF");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Sticky header */}
      <div className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-16 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/dashboard/client"
            className="flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Moje kursy
          </Link>
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

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Course header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {course.thumbnailUrl && (
            <div className="relative h-48 md:h-36 md:w-64 shrink-0 rounded-xl overflow-hidden bg-[#1a1a1a]">
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <span className="inline-block rounded-lg bg-[#1a1a1a] px-2.5 py-1 text-xs text-[#9ca3af] mb-3">
              {course.category}
            </span>
            <h1 className="text-2xl font-bold text-white mb-2">{course.title}</h1>
            <p className="text-sm text-[#6b7280] mb-1">
              Trener:{" "}
              <Link
                href={`/trainers/${course.trainer.userId}`}
                className="text-[#10B981] hover:underline"
              >
                {course.trainer.displayName}
              </Link>
            </p>
            {course.description && (
              <p className="text-sm text-[#9ca3af] line-clamp-3 mt-2">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Materials */}
        {materialsWithUrls.length === 0 ? (
          <div className="rounded-2xl bg-[#111] border border-[#1e1e1e] p-8 text-center">
            <p className="text-[#6b7280] text-sm">
              Trener jeszcze nie dodał żadnych materiałów do tego kursu.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Videos */}
            {videos.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-[#10B981]" />
                  Wideo ({videos.length})
                </h2>
                <div className="space-y-2">
                  {videos.map((mat) => (
                    <MaterialRow key={mat.id} material={mat} />
                  ))}
                </div>
              </section>
            )}

            {/* PDFs */}
            {pdfs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#10B981]" />
                  Materiały PDF ({pdfs.length})
                </h2>
                <div className="space-y-2">
                  {pdfs.map((mat) => (
                    <MaterialRow key={mat.id} material={mat} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialRow({
  material,
}: {
  material: {
    id: string;
    title: string;
    type: string;
    signedUrl: string | null;
  };
}) {
  const isVideo = material.type === "VIDEO";
  const Icon = isVideo ? PlayCircle : FileText;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#111] border border-[#1e1e1e] p-4 group hover:border-[#2a2a2a] transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a]">
        <Icon className="h-4 w-4 text-[#10B981]" />
      </div>
      <span className="flex-1 text-sm text-white">{material.title}</span>
      {material.signedUrl ? (
        <a
          href={material.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {isVideo ? (
            <>
              <PlayCircle className="h-3.5 w-3.5" />
              Odtwórz
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Pobierz
            </>
          )}
        </a>
      ) : (
        <span className="text-xs text-[#6b7280]">Niedostępne</span>
      )}
    </div>
  );
}
