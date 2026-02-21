import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

async function fulfillOrder(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const courseIds: string[] = JSON.parse(
    session.metadata?.courseIds ?? "[]"
  );

  if (!userId || courseIds.length === 0) return;

  const sessionId = session.id;
  const amountTotal = session.amount_total ?? 0;
  const perCourse = Math.round(amountTotal / courseIds.length);

  // Idempotency: skip courses already purchased via this session
  const existing = await prisma.purchase.findMany({
    where: { stripePaymentId: sessionId },
    select: { courseId: true },
  });
  const existingIds = new Set(existing.map((p) => p.courseId));
  const toCreate = courseIds.filter((id) => !existingIds.has(id));

  if (toCreate.length > 0) {
    await prisma.$transaction([
      prisma.purchase.createMany({
        data: toCreate.map((courseId) => ({
          clientId: userId,
          courseId,
          stripePaymentId: sessionId,
          amount: perCourse,
          status: "COMPLETED",
        })),
      }),
      prisma.cartItem.deleteMany({
        where: { clientId: userId, courseId: { in: courseIds } },
      }),
    ]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    console.warn(
      "[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification"
    );
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfillOrder(session);
    } catch (err) {
      console.error("[stripe/webhook] fulfillOrder error:", err);
      return NextResponse.json(
        { error: "Fulfillment failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
