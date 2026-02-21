"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Imię/pseudonim musi mieć co najmniej 2 znaki")
    .max(100, "Imię/pseudonim może mieć maksymalnie 100 znaków"),
  bio: z
    .string()
    .max(1000, "Bio może mieć maksymalnie 1000 znaków")
    .optional(),
  specializations: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export type ProfileActionState = {
  error?: string;
  message?: string;
};

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const raw = {
    displayName: formData.get("displayName") as string,
    bio: (formData.get("bio") as string) || undefined,
    specializations: (formData.get("specializations") as string) || undefined,
    avatarUrl: (formData.get("avatarUrl") as string) || undefined,
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { displayName, bio, specializations, avatarUrl } = parsed.data;

  const specializationsArray = specializations
    ? specializations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    await prisma.trainerProfile.update({
      where: { userId: user.id },
      data: {
        displayName,
        bio: bio ?? null,
        specializations: specializationsArray,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });

    revalidatePath("/dashboard/trainer/profile");
    revalidatePath(`/trainers/${user.id}`);
    revalidatePath("/dashboard/trainer");
    return { message: "Profil zaktualizowany pomyślnie!" };
  } catch {
    return { error: "Błąd zapisu. Spróbuj ponownie." };
  }
}
