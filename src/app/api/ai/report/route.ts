import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/jwt";
import { generateWardReport } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    // 1. Verify session
    const cookieStore = await cookies();
    const token = cookieStore.get("official_session")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Session invalid or expired" }, { status: 401 });
    }

    // 2. Parse payload
    const { ward } = await request.json();

    if (!ward || ward === "all") {
      return NextResponse.json({ success: false, error: "Please select a valid ward to generate a report." }, { status: 400 });
    }

    // 3. Fetch complaints for this ward
    const complaints = await prisma.complaint.findMany({
      where: { ward },
      orderBy: { createdAt: "desc" },
    });

    // 4. Generate AI executive summary report
    const reportText = await generateWardReport(ward, complaints);

    return NextResponse.json({
      success: true,
      report: reportText,
      stats: {
        total: complaints.length,
        pending: complaints.filter(c => c.status === "pending").length,
        inProgress: complaints.filter(c => c.status === "in_progress").length,
        resolved: complaints.filter(c => c.status === "resolved").length,
      }
    });
  } catch (error: any) {
    console.error("Failed to generate ward report:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
