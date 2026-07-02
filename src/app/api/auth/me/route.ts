import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("official_session")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Session invalid or expired" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      official: {
        name: payload.name,
        department: payload.department,
        email: payload.email,
        wardAssigned: payload.wardAssigned,
      },
    });
  } catch (error: any) {
    console.error("Get session profile error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
