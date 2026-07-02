import { NextResponse } from "next/server";
import { chatAgentResponse } from "@/lib/gemini";
import { VectorStore } from "@/lib/vectorStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Extract user's latest query
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    const queryText = lastUserMessage ? lastUserMessage.parts || lastUserMessage.content : "";

    // Retrieve relevant context from vector store based on last query
    let context = "No specific database context retrieved.";
    if (queryText) {
      const matches = await VectorStore.query(queryText, {}, 4);
      if (matches.length > 0) {
        context = matches
          .map((m, idx) => {
            const typeLabel = m.record.type === "policy" ? "POLICY" : "COMPLAINT";
            return `Context ${idx + 1} (${typeLabel}): ${m.record.text} (Status: ${m.record.metadata.status || "N/A"}, Urgency: ${m.record.metadata.urgency || "N/A"})`;
          })
          .join("\n");
      }
    }

    // Standardize message history structure for Gemini
    const formattedHistory = messages.map(m => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: m.parts || m.content || ""
    }));

    // Generate response using Gemini
    const replyText = await chatAgentResponse(formattedHistory, context);

    return NextResponse.json({
      success: true,
      message: {
        role: "assistant",
        content: replyText
      }
    });
  } catch (error: any) {
    console.error("Chat agent request failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate chat response" },
      { status: 500 }
    );
  }
}
