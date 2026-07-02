import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { VectorStore } from "@/lib/vectorStore";

const wardCenters: Record<string, { lat: number; lng: number }> = {
  "Ward 1": { lat: 12.9716, lng: 77.5946 },
  "Ward 2": { lat: 12.9982, lng: 77.5926 },
  "Ward 3": { lat: 12.9250, lng: 77.5896 },
  "Ward 4": { lat: 12.9782, lng: 77.6406 },
  "Ward 5": { lat: 12.9602, lng: 77.5306 }
};

const departments: Record<string, string> = {
  waste: "Sanitation & Waste Management Dept",
  water: "Water Supply & Sewerage Board",
  road: "Public Works Department (PWD)",
  electricity: "Electricity Board (Smart Grid)",
  safety: "City Safety & Security Division"
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      urgency,
      ward,
      imageUrl,
      citizenName,
      citizenPhone,
      latitude,
      longitude
    } = body;

    if (!title || !description || !category || !urgency || !ward || !citizenName || !citizenPhone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Determine coordinates if not provided
    let finalLat = parseFloat(latitude);
    let finalLng = parseFloat(longitude);

    if (isNaN(finalLat) || isNaN(finalLng)) {
      const center = wardCenters[ward] || wardCenters["Ward 1"];
      const offsetLat = (Math.random() - 0.5) * 0.006;
      const offsetLng = (Math.random() - 0.5) * 0.006;
      finalLat = parseFloat((center.lat + offsetLat).toFixed(6));
      finalLng = parseFloat((center.lng + offsetLng).toFixed(6));
    }

    const assignedDept = departments[category] || "Public Works Department (PWD)";

    // Save to SQLite
    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        category,
        urgency,
        ward,
        status: "pending",
        assignedDept,
        imageUrl: imageUrl || null,
        latitude: finalLat,
        longitude: finalLng,
        citizenName,
        citizenPhone
      }
    });

    // Generate text embedding and save to Vector Store
    const vectorText = `Complaint in ${complaint.ward} (${complaint.category} issue): ${complaint.title} - ${complaint.description}`;
    await VectorStore.add(
      complaint.id,
      "complaint",
      vectorText,
      {
        title: complaint.title,
        category: complaint.category,
        ward: complaint.ward,
        urgency: complaint.urgency,
        status: complaint.status,
        createdAt: complaint.createdAt.toISOString()
      }
    );

    return NextResponse.json({ success: true, data: complaint });
  } catch (error: any) {
    console.error("Failed to submit complaint:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit complaint" },
      { status: 500 }
    );
  }
}
