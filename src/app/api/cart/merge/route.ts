import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[merge] Unauthorized merge attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const courseIds: string[] = Array.isArray(body?.courseIds)
    ? body.courseIds
    : [];

  console.log(`[merge] userId=${user.id} incoming courseIds=${courseIds.length}:`, courseIds);

  if (courseIds.length > 0) {
    // Validate courses exist in DB to avoid FK violations
    const existingCourses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, status: true },
    });
    const existingIds = new Set(existingCourses.map((c) => c.id));
    const invalidIds = courseIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      console.warn(`[merge] Dropping invalid courseIds (not in DB):`, invalidIds);
    }

    // Skip already purchased and invalid courses
    const purchased = await prisma.purchase.findMany({
      where: {
        clientId: user.id,
        courseId: { in: courseIds },
        status: "COMPLETED",
      },
      select: { courseId: true },
    });
    const purchasedIds = new Set(purchased.map((p) => p.courseId));

    const toAdd = courseIds.filter(
      (id) => existingIds.has(id) && !purchasedIds.has(id)
    );

    console.log(`[merge] toAdd=${toAdd.length} skipped(purchased)=${purchased.length} skipped(invalid)=${invalidIds.length}`);

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
      console.log(`[merge] Inserted ${toAdd.length} items to cart_items`);
    }
  }

  const items = await prisma.cartItem.findMany({
    where: { clientId: user.id },
    select: { courseId: true },
  });

  console.log(`[merge] Final DB cart size: ${items.length}`);
  return NextResponse.json({ courseIds: items.map((i) => i.courseId) });
}
