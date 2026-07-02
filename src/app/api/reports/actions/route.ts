import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/jwt";

// GET: Retrieve actions for a complaint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const complaintId = searchParams.get("complaintId");

    if (!complaintId) {
      return NextResponse.json(
        { success: false, error: "Complaint ID is required" },
        { status: 400 }
      );
    }

    const actionLogs = await prisma.actionLog.findMany({
      where: { complaintId },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ success: true, data: actionLogs });
  } catch (error: any) {
    console.error("Failed to fetch action logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch action logs" },
      { status: 500 }
    );
  }
}

// POST: Add a new action log and update complaint status if needed
export async function POST(request: Request) {
  try {
    // 1. Verify official session
    const cookieStore = await cookies();
    const token = cookieStore.get("official_session")?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }
    
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Session invalid or expired" }, { status: 401 });
    }

    // 2. Parse request parameters
    const { complaintId, actionType, notes, newStatus, photoUrl } = await request.json();

    if (!complaintId || !actionType || !notes) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (complaintId, actionType, notes)" },
        { status: 400 }
      );
    }

    // 3. Create the Action Log entry
    const newLog = await prisma.actionLog.create({
      data: {
        complaintId,
        actionType,
        notes,
        officialName: payload.name,
        photoUrl: photoUrl || null,
        timestamp: new Date()
      }
    });

    // 4. Update the complaint status if applicable
    if (newStatus && ["pending", "routed", "in_progress", "resolved"].includes(newStatus)) {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: { status: newStatus }
      });
      
      // Update vector store metadata as well to keep RAG search current
      try {
        const { VectorStore } = require("@/lib/vectorStore");
        // Find existing record or update it
        // Note: vector store key matches complaint ID
        const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
        if (complaint) {
          await VectorStore.add(
            complaint.id,
            "complaint",
            `Complaint in ${complaint.ward} (${complaint.category} issue): ${complaint.title} - ${complaint.description}`,
            {
              title: complaint.title,
              category: complaint.category,
              ward: complaint.ward,
              urgency: complaint.urgency,
              status: complaint.status,
              createdAt: complaint.createdAt.toISOString()
            }
          );
        }
      } catch (vectorErr) {
        console.error("Vector store metadata update failed:", vectorErr);
      }
    }

    return NextResponse.json({ success: true, data: newLog });
  } catch (error: any) {
    console.error("Failed to post action log:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to post action log" },
      { status: 500 }
    );
  }
}
