"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getTrainerProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) redirect("/dashboard");

  return { userId: user.id, profile };
}

// ---------------------------------------------------------------------------
// Course schema
// ---------------------------------------------------------------------------

const courseSchema = z.object({
  title: z
    .string()
    .min(3, "Tytuł musi mieć co najmniej 3 znaki")
    .max(200, "Tytuł może mieć maksymalnie 200 znaków"),
  // description i category są NOT NULL w DB — empty string jako brak wartości
  description: z.string().max(5000, "Opis może mieć maksymalnie 5000 znaków").default(""),
  price: z.coerce
    .number()
    .min(0, "Cena nie może być ujemna")
    .max(100000, "Cena jest za wysoka (max 100 000 PLN)"),
  category: z.string().max(100).default(""),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  thumbnailUrl: z.string().optional(),
});

export type CourseActionState = {
  error?: string;
  message?: string;
};

// ---------------------------------------------------------------------------
// Create course — redirects to edit page on success
// ---------------------------------------------------------------------------

export async function createCourseAction(
  _prevState: CourseActionState,
  formData: FormData
): Promise<CourseActionState> {
  const { profile } = await getTrainerProfile();

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: (formData.get("description") as string) ?? "",
    price: formData.get("price"),
    category: (formData.get("category") as string) ?? "",
    status: formData.get("status"),
    thumbnailUrl: (formData.get("thumbnailUrl") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, description, price, category, status, thumbnailUrl } =
    parsed.data;

  const course = await prisma.course.create({
    data: {
      trainerId: profile.id,
      title,
      description,
      price: Math.round(price * 100), // PLN → grosze
      category,
      status,
      thumbnailUrl: thumbnailUrl ?? null,
    },
  });

  revalidatePath("/dashboard/trainer");
  revalidatePath("/dashboard/trainer/courses");

  redirect(`/dashboard/trainer/courses/${course.id}/edit`);
}

// ---------------------------------------------------------------------------
// Update course
// ---------------------------------------------------------------------------

export async function updateCourseAction(
  courseId: string,
  _prevState: CourseActionState,
  formData: FormData
): Promise<CourseActionState> {
  const { profile } = await getTrainerProfile();

  const course = await prisma.course.findFirst({
    where: { id: courseId, trainerId: profile.id },
  });
  if (!course) return { error: "Kurs nie istnieje lub brak dostępu" };

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: (formData.get("description") as string) ?? "",
    price: formData.get("price"),
    category: (formData.get("category") as string) ?? "",
    status: formData.get("status"),
    thumbnailUrl: (formData.get("thumbnailUrl") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, description, price, category, status, thumbnailUrl } =
    parsed.data;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title,
      description,
      price: Math.round(price * 100),
      category,
      status,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    },
  });

  revalidatePath("/dashboard/trainer");
  revalidatePath("/dashboard/trainer/courses");
  revalidatePath(`/dashboard/trainer/courses/${courseId}/edit`);
  revalidatePath(`/trainers/${profile.userId}`);

  return { message: "Kurs zaktualizowany!" };
}

// ---------------------------------------------------------------------------
// Delete course — redirects to courses list
// ---------------------------------------------------------------------------

export async function deleteCourseAction(
  courseId: string,
  _formData: FormData
): Promise<void> {
  const { profile } = await getTrainerProfile();

  const course = await prisma.course.findFirst({
    where: { id: courseId, trainerId: profile.id },
  });
  if (!course) return;

  // Cascade deletes materials (set in schema via onDelete)
  await prisma.course.delete({ where: { id: courseId } });

  revalidatePath("/dashboard/trainer");
  revalidatePath("/dashboard/trainer/courses");

  redirect("/dashboard/trainer/courses");
}

// ---------------------------------------------------------------------------
// Material schema
// ---------------------------------------------------------------------------

const materialSchema = z.object({
  title: z
    .string()
    .min(1, "Tytuł materiału jest wymagany")
    .max(200),
  type: z.enum(["VIDEO", "PDF"]),
  fileUrl: z.string().min(1, "Plik jest wymagany"),
});

export type MaterialActionState = {
  error?: string;
  message?: string;
};

// ---------------------------------------------------------------------------
// Add material
// ---------------------------------------------------------------------------

export async function addMaterialAction(
  courseId: string,
  _prevState: MaterialActionState,
  formData: FormData
): Promise<MaterialActionState> {
  const { profile } = await getTrainerProfile();

  const course = await prisma.course.findFirst({
    where: { id: courseId, trainerId: profile.id },
    include: { _count: { select: { materials: true } } },
  });
  if (!course) return { error: "Kurs nie istnieje lub brak dostępu" };

  const parsed = materialSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    fileUrl: formData.get("fileUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, type, fileUrl } = parsed.data;

  await prisma.courseMaterial.create({
    data: {
      courseId,
      title,
      type,
      fileUrl,
      position: course._count.materials + 1,
    },
  });

  revalidatePath(`/dashboard/trainer/courses/${courseId}/edit`);

  return { message: "Materiał dodany!" };
}

// ---------------------------------------------------------------------------
// Delete material
// ---------------------------------------------------------------------------

export async function deleteMaterialAction(
  courseId: string,
  materialId: string,
  _formData: FormData
): Promise<void> {
  const { profile } = await getTrainerProfile();

  const course = await prisma.course.findFirst({
    where: { id: courseId, trainerId: profile.id },
  });
  if (!course) return;

  await prisma.courseMaterial.delete({
    where: { id: materialId, courseId },
  });

  // Renumber remaining materials
  const remaining = await prisma.courseMaterial.findMany({
    where: { courseId },
    orderBy: { position: "asc" },
  });
  await Promise.all(
    remaining.map((m, i) =>
      prisma.courseMaterial.update({
        where: { id: m.id },
        data: { position: i + 1 },
      })
    )
  );

  revalidatePath(`/dashboard/trainer/courses/${courseId}/edit`);
}
