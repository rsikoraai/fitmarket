import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "CLIENT") {
    return NextResponse.json(
      { error: "Only clients can purchase courses" },
      { status: 403 }
    );
  }

  // Fallback courseIds sent by the client (in case DB cart is empty due to merge race)
  const body = await req.json().catch(() => ({}));
  const fallbackIds: string[] = Array.isArray(body?.courseIds)
    ? body.courseIds
    : [];

  // Fetch PUBLISHED cart items from DB
  const dbCartItems = await prisma.cartItem.findMany({
    where: {
      clientId: user.id,
      course: { status: "PUBLISHED" },
    },
    include: {
      course: {
        select: { id: true, title: true, price: true, thumbnailUrl: true },
      },
    },
  });

  console.log(
    `[checkout] userId=${user.id} dbCart=${dbCartItems.length} fallback=${fallbackIds.length}`
  );

  type CheckoutCourse = {
    id: string;
    title: string;
    price: number;
    thumbnailUrl: string | null;
  };

  let checkoutCourses: CheckoutCourse[];

  if (dbCartItems.length > 0) {
    checkoutCourses = dbCartItems.map((i) => i.course);
  } else if (fallbackIds.length > 0) {
    // DB cart is empty (merge race) — validate fallback ids against DB
    console.log(
      `[checkout] DB cart empty — using fallback courseIds:`,
      fallbackIds
    );

    // Exclude already-purchased courses
    const purchased = await prisma.purchase.findMany({
      where: {
        clientId: user.id,
        courseId: { in: fallbackIds },
        status: "COMPLETED",
      },
      select: { courseId: true },
    });
    const purchasedSet = new Set(purchased.map((p) => p.courseId));
    const unpurchasedIds = fallbackIds.filter((id) => !purchasedSet.has(id));

    const courses = await prisma.course.findMany({
      where: { id: { in: unpurchasedIds }, status: "PUBLISHED" },
      select: { id: true, title: true, price: true, thumbnailUrl: true },
    });
    checkoutCourses = courses;
    console.log(
      `[checkout] Fallback resolved ${courses.length} published courses (skipped ${purchased.length} already purchased)`
    );
  } else {
    checkoutCourses = [];
  }

  if (checkoutCourses.length === 0) {
    console.warn(
      `[checkout] FAIL: no published courses. userId=${user.id} dbCart=${dbCartItems.length} fallback=${fallbackIds.length}`
    );
    return NextResponse.json(
      { error: "Koszyk nie zawiera żadnych opublikowanych kursów." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const courseIds = checkoutCourses.map((c) => c.id);

  const lineItems = checkoutCourses.map((course) => ({
    price_data: {
      currency: "pln",
      product_data: {
        name: course.title,
        ...(course.thumbnailUrl ? { images: [course.thumbnailUrl] } : {}),
      },
      unit_amount: course.price,
    },
    quantity: 1,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "blik", "p24"],
    mode: "payment",
    line_items: lineItems,
    success_url: `${appUrl}/koszyk/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/koszyk`,
    metadata: {
      userId: user.id,
      courseIds: JSON.stringify(courseIds),
    },
  });

  console.log(
    `[checkout] session created: ${session.id} for ${courseIds.length} courses`
  );
  return NextResponse.json({ url: session.url });
}
