"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { registerSchema, loginSchema, type AuthActionState } from "@/types"

function getSafeRedirect(formData: FormData): string {
  const raw = formData.get("redirectTo")
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw
  }
  return "/dashboard"
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
  }

  const result = registerSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, password, role } = result.data

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  })

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Konto z tym adresem email już istnieje" }
    }
    return { error: error.message }
  }

  if (!data.user) {
    return { error: "Nie udało się utworzyć konta" }
  }

  // Utwórz użytkownika w publicznej tabeli
  await prisma.user.create({
    data: {
      id: data.user.id,
      email: data.user.email!,
      role,
    },
  })

  // Trener dostaje też pusty profil
  if (role === "TRAINER") {
    await prisma.trainerProfile.create({
      data: {
        userId: data.user.id,
        displayName: email.split("@")[0],
        specializations: [],
      },
    })
  }

  // Jeśli sesja istnieje od razu (email confirmation wyłączone) — przekieruj
  if (data.session) {
    redirect(getSafeRedirect(formData))
  }

  // Supabase wymaga potwierdzenia emaila
  return { message: "Sprawdź skrzynkę — wysłaliśmy link aktywacyjny." }
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, password } = result.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Nieprawidłowy email lub hasło" }
  }

  redirect(getSafeRedirect(formData))
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
