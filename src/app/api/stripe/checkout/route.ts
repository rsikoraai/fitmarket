import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
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

  // Diagnostic: fetch ALL cart items first (without status filter)
  const allCartItems = await prisma.cartItem.findMany({
    where: { clientId: user.id },
    include: {
      course: { select: { id: true, title: true, status: true } },
    },
  });

  console.log(`[checkout] userId=${user.id} allCartItems=${allCartItems.length}`,
    allCartItems.map(i => ({ courseId: i.courseId, status: i.course.status, title: i.course.title }))
  );

  // Filter at DB level — PUBLISHED only
  const cartItems = await prisma.cartItem.findMany({
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

  console.log(`[checkout] publishedCartItems=${cartItems.length}`,
    cartItems.map(i => ({ courseId: i.courseId, title: i.course.title }))
  );

  if (cartItems.length === 0) {
    console.warn(`[checkout] FAIL: no published items. allItems=${allCartItems.length}, userId=${user.id}`);
    return NextResponse.json(
      { error: "Koszyk nie zawiera żadnych opublikowanych kursów." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const courseIds = cartItems.map((item) => item.course.id);

  const lineItems = cartItems.map((item) => ({
    price_data: {
      currency: "pln",
      product_data: {
        name: item.course.title,
        ...(item.course.thumbnailUrl
          ? { images: [item.course.thumbnailUrl] }
          : {}),
      },
      unit_amount: item.course.price,
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

  console.log(`[checkout] session created: ${session.id} for ${courseIds.length} courses`);
  return NextResponse.json({ url: session.url });
}
