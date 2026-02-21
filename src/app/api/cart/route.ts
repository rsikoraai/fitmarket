import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ courseIds: [] });
  }

  const items = await prisma.cartItem.findMany({
    where: { clientId: user.id },
    select: { courseId: true },
  });

  console.log(`[cart GET] userId=${user.id} items=${items.length}`);
  return NextResponse.json({ courseIds: items.map((i) => i.courseId) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const courseId = body?.courseId as string | undefined;

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  // Validate course exists before inserting (prevents FK error)
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true },
  });

  if (!course) {
    console.error(`[cart POST] courseId=${courseId} not found in DB`);
    return NextResponse.json({ error: "Kurs nie istnieje" }, { status: 404 });
  }

  await prisma.cartItem.upsert({
    where: { clientId_courseId: { clientId: user.id, courseId } },
    create: { clientId: user.id, courseId },
    update: {},
  });

  console.log(`[cart POST] userId=${user.id} added courseId=${courseId} status=${course.status}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const courseId = body?.courseId as string | undefined;

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  await prisma.cartItem.deleteMany({
    where: { clientId: user.id, courseId },
  });

  return NextResponse.json({ ok: true });
}
