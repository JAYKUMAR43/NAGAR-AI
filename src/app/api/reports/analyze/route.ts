import { NextResponse } from "next/server";
import { classifyIssue } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, image, mimeType } = body;

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    // Call Gemini classifier
    const analysis = await classifyIssue(description, image, mimeType);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error("Failed to analyze issue:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze issue" },
      { status: 500 }
    );
  }
}
