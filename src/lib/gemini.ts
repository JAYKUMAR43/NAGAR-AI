import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const hasKey = apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here";

const genAI = hasKey ? new GoogleGenerativeAI(apiKey) : null;

// Helper to check if API key is active
export function isGeminiActive(): boolean {
  return hasKey;
}

// Generate deterministic mock embedding if API Key is not set
// Computes a 768-dimensional normalized pseudo-random vector based on string hash
function getMockEmbedding(text: string): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const vec: number[] = [];
  let seed = hash;
  for (let i = 0; i < 768; i++) {
    seed = (seed * 1664525 + 1013904223) | 0;
    vec.push(seed / 2147483647);
  }
  // Normalize vector
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(v => (mag === 0 ? 0 : v / mag));
}

// Generate text embeddings using text-embedding-004
export async function getEmbedding(text: string): Promise<number[]> {
  if (!hasKey || !genAI) {
    return getMockEmbedding(text);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Gemini Embedding API Error, falling back to mock:", error);
    return getMockEmbedding(text);
  }
}

// Multimodal issue classifier using gemini-2.0-flash
interface ClassificationResult {
  title: string;
  category: "waste" | "water" | "road" | "electricity" | "safety";
  urgency: "low" | "medium" | "high" | "critical";
  descriptionSummary: string;
  assignedDept: string;
}

export async function classifyIssue(
  description: string,
  imageBase64?: string,
  mimeType?: string
): Promise<ClassificationResult> {
  const lowercaseDesc = description.toLowerCase();

  // HEURISTIC / KEYWORD FALLBACK
  const runFallback = (): ClassificationResult => {
    let category: "waste" | "water" | "road" | "electricity" | "safety" = "road";
    let assignedDept = "Public Works Department (PWD)";
    let urgency: "low" | "medium" | "high" | "critical" = "medium";

    if (lowercaseDesc.includes("leak") || lowercaseDesc.includes("water") || lowercaseDesc.includes("pipe") || lowercaseDesc.includes("sewage")) {
      category = "water";
      assignedDept = "Water Supply & Sewerage Board";
    } else if (lowercaseDesc.includes("garbage") || lowercaseDesc.includes("trash") || lowercaseDesc.includes("waste") || lowercaseDesc.includes("dump") || lowercaseDesc.includes("litter")) {
      category = "waste";
      assignedDept = "Sanitation & Waste Management Dept";
    } else if (lowercaseDesc.includes("light") || lowercaseDesc.includes("power") || lowercaseDesc.includes("electricity") || lowercaseDesc.includes("wire") || lowercaseDesc.includes("transformer")) {
      category = "electricity";
      assignedDept = "Electricity Board (Smart Grid)";
    } else if (lowercaseDesc.includes("safety") || lowercaseDesc.includes("dark") || lowercaseDesc.includes("crime") || lowercaseDesc.includes("threat") || lowercaseDesc.includes("police") || lowercaseDesc.includes("harass")) {
      category = "safety";
      assignedDept = "City Safety & Security Division";
    }

    if (lowercaseDesc.includes("immediate") || lowercaseDesc.includes("danger") || lowercaseDesc.includes("hazard") || lowercaseDesc.includes("accident") || lowercaseDesc.includes("electric shock") || lowercaseDesc.includes("flood")) {
      urgency = "critical";
    } else if (lowercaseDesc.includes("broken") || lowercaseDesc.includes("leak") || lowercaseDesc.includes("stolen") || lowercaseDesc.includes("block")) {
      urgency = "high";
    } else if (lowercaseDesc.includes("clean") || lowercaseDesc.includes("pothole")) {
      urgency = "medium";
    } else {
      urgency = "low";
    }

    const title = description.length > 40 ? description.substring(0, 40) + "..." : description;

    return {
      title,
      category,
      urgency,
      descriptionSummary: `Report regarding ${category} issue: ${description.slice(0, 80)}...`,
      assignedDept
    };
  };

  if (!hasKey || !genAI) {
    // Delay slightly to simulate AI API call
    await new Promise(r => setTimeout(r, 1500));
    return runFallback();
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `You are the core routing and classification engine for Nagar AI, a Smart City Civic Intelligence System.
Analyze the following description of a citizen civic complaint.
If a photo is attached, analyze the photo as well to verify the issue and refine the classification.

Provide a JSON output matching this structure:
{
  "title": "A short, concise title (max 5-6 words)",
  "category": "waste" | "water" | "road" | "electricity" | "safety",
  "urgency": "low" | "medium" | "high" | "critical",
  "descriptionSummary": "A clear, concise, objective 1-2 sentence summary of the reported issue.",
  "assignedDept": "Department Name to handle this issue"
}

Guide for urgency:
- "critical": Live electrical wires exposed, major water main bursts causing floods, violent security threats, hazards in high-traffic zones.
- "high": Broken streetlights rendering whole streets dark, major potholes on fast roads, minor water leaks, overflowing public bins causing obstruction.
- "medium": Potholes on residential roads, litter, non-hazardous illegal parking.
- "low": General inquiries, requests for aesthetic improvements, minor cosmetic wear on public property.

Guide for Departments:
- waste: "Sanitation & Waste Management Dept"
- water: "Water Supply & Sewerage Board"
- road: "Public Works Department (PWD)"
- electricity: "Electricity Board (Smart Grid)"
- safety: "City Safety & Security Division"

Return ONLY valid JSON. No markdown wrappers.`;

    let result;
    if (imageBase64 && mimeType) {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };
      result = await model.generateContent([
        prompt,
        imagePart,
        `Citizen description: "${description}"`
      ]);
    } else {
      result = await model.generateContent([
        prompt,
        `Citizen description: "${description}"`
      ]);
    }

    const text = result.response.text();
    // Strip markdown formatting if any (e.g. ```json ... ```)
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanedText) as ClassificationResult;
    return data;
  } catch (error) {
    console.error("Gemini Classification API Error, falling back to heuristics:", error);
    return runFallback();
  }
}

// Synthesize search answers using Gemini RAG
export async function synthesizeAnswer(
  query: string,
  retrievedContext: string
): Promise<string> {
  if (!hasKey || !genAI) {
    // Delay slightly
    await new Promise(r => setTimeout(r, 1000));
    return `*(Demo Mode - Gemini API Key not set. Showing simulated analysis)*: Based on the retrieved complaints, there appears to be a pattern. Here is the local telemetry details:
    
${retrievedContext.slice(0, 400)}...

For live synthesis and smart reasoning, please set your Google Gemini API Key in \`.env.local\`.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are "Nagar AI", the Decision Intelligence Assistant for city administrators and citizens.
You have access to a set of retrieved civic complaints matching the user's natural language query.
Answer the user's question concisely, pointing out patterns, common wards, categories, or trends if relevant.
Do not make up facts outside the retrieved complaints context.
If no complaints are found in the context, politely state that.

Retrieved Context (Complaints & Policies):
${retrievedContext}

User Query:
"${query}"

Provide a professional, clean response using markdown. Emphasize key numbers or recommendations. Keep it under 200 words.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Synthesis Error:", error);
    return `Failed to synthesize response from Gemini. Retrieved Context was: \n\n${retrievedContext}`;
  }
}

// Streaming chat agent
export async function chatAgentResponse(
  messageHistory: { role: "user" | "model" | "system"; parts: string }[],
  context: string
): Promise<string> {
  if (!hasKey || !genAI) {
    await new Promise(r => setTimeout(r, 800));
    const lastUserMsg = messageHistory[messageHistory.length - 1]?.parts || "";
    return `Hello! I am Nagar AI. I am currently running in **Demo Mode** because the \`GEMINI_API_KEY\` environment variable is not configured.
    
Here is what I found in my database context for your message:
${context.slice(0, 300)}...

If you have questions about specific categories or wards, I can use heuristics to tell you. To unlock full LLM chat conversations and live RAG, please add your Gemini API Key in \`.env.local\`.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({
      history: messageHistory.slice(0, -1).map(h => ({
        role: h.role === "system" ? "user" : h.role, // gemini SDK expects 'user' or 'model'
        parts: [{ text: h.parts }]
      })),
      systemInstruction: `You are "Nagar AI", an interactive, smart civic intelligence bot for citizens and officials of this municipality.
Use the following local database context (complaints, statuses, and city policy guidelines) to answer user questions:
---
${context}
---
Be helpful, empathetic, and professional. You can guide citizens on how to report issues and explain what happens to their reports (automatic routing to relevant departments, urgency scoring, etc.).`,
    });

    const lastMsg = messageHistory[messageHistory.length - 1];
    const result = await chat.sendMessage(lastMsg.parts);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Chat Agent Error:", error);
    return "I apologize, but I encountered an error communicating with my neural engine. Please verify the Gemini API Key configuration.";
  }
}

// Generate AI-powered executive report for a specific ward
export async function generateWardReport(
  wardName: string,
  complaints: any[]
): Promise<string> {
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter((c) => c.status === "in_progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const critical = complaints.filter((c) => c.urgency === "critical").length;
  const high = complaints.filter((c) => c.urgency === "high").length;

  const categoryCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });

  const categoryStats = Object.entries(categoryCounts)
    .map(([cat, count]) => `- **${cat.toUpperCase()}**: ${count} ticket(s)`)
    .join("\n");

  if (!hasKey || !genAI) {
    // Generate beautiful heuristic markdown fallback
    await new Promise((r) => setTimeout(r, 1200)); // simulation delay

    let healthStatus = "🔴 CRITICAL CONGESTION";
    let healthDetails = `Ward is experiencing elevated stress due to ${critical + high} active high-priority reports. Immediate intervention is advised.`;
    
    if (critical === 0 && high <= 1) {
      healthStatus = "🟢 OPTIMAL / STABLE";
      healthDetails = "Ward parameters are within normal limits. General maintenance is progressing on schedule.";
    } else if (critical === 0 && high <= 3) {
      healthStatus = "🟡 MODERATE LOAD";
      healthDetails = "Minor backlogs detected. Resource re-routing should prevent escalations.";
    }

    return `## Executive Municipal Summary for **${wardName}**
*Generated by Nagar AI Core (Demo Heuristics Active)*

### 1. Operations Overview & Status
- **Ward Health Index**: ${healthStatus}
- **Telemetry Assessment**: ${healthDetails}
- **Active Incident Load**: **${pending + inProgress}** outstanding issues out of **${total}** total reported logs.

### 2. Live Ticket Metrics
- **Pending Dispatch/Audit**: ${pending}
- **In-Progress Workorders**: ${inProgress}
- **Resolved/Closed Logs**: ${resolved}
- **Urgency Distribution**: ${critical} Critical | ${high} High | ${total - (critical + high)} Medium/Low

### 3. Sector Distribution Analysis
${categoryStats || "*No incidents logged in this ward.*"}

### 4. Direct Operational Recommendations
1. ${critical > 0 ? `**Prioritize Critical Items**: Coordinate immediate dispatches to secure the ${critical} critical issue(s) reported.` : "**Establish Routine Audits**: Clean up minor tickets and monitor active works."}
2. **Review Dispatch Speed**: The department assignment process is maintaining typical response times, but focus should shift toward resolving the oldest pending issues.
3. **Cross-Department Collaboration**: Ensure the utility boards collaborate on overlapping issues (e.g. road damage related to water pipe bursts).`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Format complaints for context
    const complaintDetails = complaints
      .map(
        (c) =>
          `- Title: ${c.title}\n  Category: ${c.category}\n  Urgency: ${c.urgency}\n  Status: ${c.status}\n  Description: ${c.description}\n  Filed: ${new Date(c.createdAt).toLocaleDateString()}`
      )
      .join("\n\n");

    const prompt = `You are the Chief Operations Officer at Nagar AI's municipal command center.
Synthesize a detailed Executive Operations Report for the ward: "${wardName}".

Use the following raw complaint data for this ward:
---
Total Complaints: ${total}
Pending Verification: ${pending}
In Progress: ${inProgress}
Resolved: ${resolved}
Critical Urgency: ${critical}
High Urgency: ${high}

Incidents List:
${complaintDetails}
---

Your response must be a professional, actionable executive report written in Markdown. Include:
1. A summary title and overall Ward Health Assessment (classify as Green/Stable, Yellow/Caution, or Red/Critical based on volume and severity).
2. Key Operational Statistics.
3. Core areas of concern (which category/department is under the most stress and why).
4. Immediate Operational Recommendations (what should the officials dispatch or inspect first).

Keep it under 300 words. Be objective, concise, and professional.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Failed to generate AI ward report:", error);
    return `Failed to synthesize report due to an API error. Raw stats for ${wardName}: Total ${total}, Pending ${pending}, In Progress ${inProgress}, Resolved ${resolved}.`;
  }
}

