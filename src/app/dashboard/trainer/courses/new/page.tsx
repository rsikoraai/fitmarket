import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CourseForm } from "@/components/trainer/CourseForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewCoursePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== "TRAINER") redirect("/dashboard/client");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
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
          <span className="text-foreground">Nowy kurs</span>
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>Nowy kurs</CardTitle>
            <CardDescription>
              Uzupełnij podstawowe informacje. Po zapisaniu przejdziesz do
              edytora, gdzie dodasz materiały wideo i PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseForm userId={user.id} mode="create" />
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
