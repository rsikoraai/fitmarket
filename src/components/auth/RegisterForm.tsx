"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { registerAction } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const roles = [
  {
    value: "CLIENT",
    label: "Klient",
    description: "Kupuję i przerabiam kursy",
  },
  {
    value: "TRAINER",
    label: "Trener",
    description: "Tworzę i sprzedaję kursy",
  },
] as const

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, {})
  const [selectedRole, setSelectedRole] = useState<"CLIENT" | "TRAINER">("CLIENT")

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md bg-[#10B981]/10 border border-[#10B981]/30 px-3 py-2 text-sm text-[#10B981]">
          {state.message}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ty@przykład.pl"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Min. 8 znaków"
        />
      </div>

      <div className="space-y-2">
        <Label>Rola</Label>
        {/* Hidden input — wartość przenoszona do FormData */}
        <input type="hidden" name="role" value={selectedRole} />
        <div className="grid grid-cols-2 gap-2">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelectedRole(role.value)}
              className={cn(
                "rounded-md border px-4 py-3 text-left text-sm transition-colors",
                selectedRole === role.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-accent"
              )}
            >
              <div className="font-medium">{role.label}</div>
              <div className="text-xs text-muted-foreground">{role.description}</div>
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Tworzenie konta..." : "Zarejestruj się"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Zaloguj się
        </Link>
      </p>
    </form>
  )
}
