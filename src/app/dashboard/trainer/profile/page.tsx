import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/components/trainer/ProfileEditForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TrainerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { trainerProfile: true },
  });

  if (!dbUser || dbUser.role !== "TRAINER") redirect("/dashboard/client");

  if (!dbUser.trainerProfile) {
    // Nie powinno się zdarzyć — profil tworzony przy rejestracji
    redirect("/dashboard/trainer");
  }

  const { trainerProfile } = dbUser;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Breadcrumb nav */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard/trainer"
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Mój profil</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edytuj profil trenera</CardTitle>
            <CardDescription>
              Uzupełnij swój profil, aby klienci mogli Cię lepiej poznać.{" "}
              <Link
                href={`/trainers/${user.id}`}
                className="text-primary underline underline-offset-4 hover:no-underline"
                target="_blank"
              >
                Zobacz profil publiczny →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileEditForm
              userId={user.id}
              initialData={{
                displayName: trainerProfile.displayName,
                bio: trainerProfile.bio,
                specializations: trainerProfile.specializations,
                avatarUrl: trainerProfile.avatarUrl,
              }}
            />
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/trainer">← Wróć do dashboardu</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
