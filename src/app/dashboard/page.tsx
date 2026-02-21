import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// Router dashboardu — przekierowuje na odpowiedni panel na podstawie roli
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  if (!dbUser) {
    redirect("/login")
  }

  if (dbUser.role === "TRAINER") {
    redirect("/dashboard/trainer")
  } else {
    redirect("/dashboard/client")
  }
}
