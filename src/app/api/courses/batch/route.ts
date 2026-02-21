import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/courses/batch?ids=id1&ids=id2
// Public endpoint — returns basic course info for given IDs (PUBLISHED only)
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.getAll("ids");

  if (!ids.length) {
    return NextResponse.json({ courses: [] });
  }

  const courses = await prisma.course.findMany({
    where: {
      id: { in: ids },
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      price: true,
      category: true,
      thumbnailUrl: true,
      trainer: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json({ courses });
}
