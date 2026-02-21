import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
  role: z.enum(["TRAINER", "CLIENT"]),
})

export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
})

export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>

export type AuthActionState = {
  error?: string
  message?: string
}
