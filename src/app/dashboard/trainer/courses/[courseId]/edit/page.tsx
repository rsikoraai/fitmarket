import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CourseForm } from "@/components/trainer/CourseForm";
import { CourseMaterialsManager } from "@/components/trainer/CourseMaterialsManager";
import { DeleteCourseButton } from "@/components/trainer/DeleteCourseButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function EditCoursePage({ params }: Props) {
  const { courseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) redirect("/dashboard");

  const course = await prisma.course.findFirst({
    where: { id: courseId, trainerId: profile.id },
    include: {
      materials: { orderBy: { position: "asc" } },
    },
  });

  if (!course) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard/trainer"
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/dashboard/trainer/courses"
            className="hover:text-foreground transition-colors"
          >
            Moje kursy
          </Link>
          <span>/</span>
          <span className="max-w-[180px] truncate text-foreground">
            {course.title}
          </span>
        </nav>

        {/* Status + meta */}
        <div className="mb-5 flex items-center gap-3">
          <Badge
            variant={course.status === "PUBLISHED" ? "default" : "secondary"}
          >
            {course.status === "PUBLISHED" ? "Opublikowany" : "Szkic"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {course.materials.length}{" "}
            {course.materials.length === 1 ? "materiał" : "materiałów"}
          </span>
        </div>

        {/* Course details */}
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły kursu</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm
              userId={user.id}
              mode="edit"
              initialData={{
                id: course.id,
                title: course.title,
                description: course.description,
                price: course.price,
                category: course.category,
                thumbnailUrl: course.thumbnailUrl,
                status: course.status,
              }}
            />
          </CardContent>
        </Card>

        {/* Materials */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Materiały kursu</CardTitle>
            <CardDescription>
              Pliki wideo i PDF widoczne dla klientów po zakupie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseMaterialsManager
              courseId={courseId}
              userId={user.id}
              materials={course.materials}
            />
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="mt-6 border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">
              Strefa niebezpieczna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Usuń ten kurs</p>
                <p className="text-xs text-muted-foreground">
                  Tej akcji nie można cofnąć. Kurs i wszystkie materiały
                  zostaną trwale usunięte.
                </p>
              </div>
              <DeleteCourseButton courseId={courseId} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/trainer/courses">
              ← Wróć do listy kursów
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
