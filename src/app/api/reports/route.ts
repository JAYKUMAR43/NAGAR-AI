import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const ward = searchParams.get("ward");
    const status = searchParams.get("status");
    const urgency = searchParams.get("urgency");
    const query = searchParams.get("query");

    // Build Prisma query filters
    const where: any = {};

    if (category && category !== "all") {
      where.category = category;
    }
    if (ward && ward !== "all") {
      where.ward = ward;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (urgency && urgency !== "all") {
      where.urgency = urgency;
    }
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { citizenName: { contains: query } }
      ];
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ success: true, data: complaints });
  } catch (error: any) {
    console.error("Failed to fetch complaints:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch complaints" },
      { status: 500 }
    );
  }
}
