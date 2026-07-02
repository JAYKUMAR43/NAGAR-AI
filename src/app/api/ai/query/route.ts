import { NextResponse } from "next/server";
import { VectorStore } from "@/lib/vectorStore";
import { synthesizeAnswer } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    // Query Vector Store (search across both complaints and policies)
    const matches = await VectorStore.query(query, {}, 5);

    // Build context text
    let context = "";
    const sourceRecords = [];

    if (matches.length > 0) {
      context = matches
        .map((m, idx) => {
          const typeLabel = m.record.type === "policy" ? "CITY POLICY" : "CITIZEN COMPLAINT";
          const scorePercent = (m.score * 100).toFixed(1);
          return `[Source ${idx + 1}] (${typeLabel}, Similarity: ${scorePercent}%)\nText: ${m.record.text}\nMetadata: ${JSON.stringify(m.record.metadata)}\n`;
        })
        .join("\n---\n");

      // Extract sources for display
      for (const m of matches) {
        sourceRecords.push({
          id: m.record.id,
          type: m.record.type,
          text: m.record.text,
          score: m.score,
          metadata: m.record.metadata
        });
      }
    } else {
      context = "No relevant complaints or policies found in the local vector database.";
    }

    // Synthesize response using Gemini
    const answer = await synthesizeAnswer(query, context);

    return NextResponse.json({
      success: true,
      answer,
      sources: sourceRecords
    });
  } catch (error: any) {
    console.error("RAG search query failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process search query" },
      { status: 500 }
    );
  }
}
