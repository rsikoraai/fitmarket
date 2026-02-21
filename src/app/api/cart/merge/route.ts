import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST /api/cart/merge
// body: { courseIds: string[] }
// Merges provided courseIds into the user's cart_items (skipping duplicates and purchased courses)
// Returns the updated full cart state
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const courseIds: string[] = Array.isArray(body?.courseIds)
    ? body.courseIds
    : [];

  if (courseIds.length > 0) {
    // Skip already purchased courses
    const purchased = await prisma.purchase.findMany({
      where: {
        clientId: user.id,
        courseId: { in: courseIds },
        status: "COMPLETED",
      },
      select: { courseId: true },
    });
    const purchasedIds = new Set(purchased.map((p) => p.courseId));
    const toAdd = courseIds.filter((id) => !purchasedIds.has(id));

    if (toAdd.length > 0) {
      await prisma.$transaction(
        toAdd.map((courseId) =>
          prisma.cartItem.upsert({
            where: { clientId_courseId: { clientId: user.id, courseId } },
            create: { clientId: user.id, courseId },
            update: {},
          })
        )
      );
    }
  }

  // Return updated cart state
  const items = await prisma.cartItem.findMany({
    where: { clientId: user.id },
    select: { courseId: true },
  });

  return NextResponse.json({ courseIds: items.map((i) => i.courseId) });
}
