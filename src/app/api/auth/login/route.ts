import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signJWT } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find the official
    const official = await prisma.official.findUnique({
      where: { email },
    });

    if (!official || official.password !== password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT
    const payload = {
      id: official.id,
      email: official.email,
      name: official.name,
      department: official.department,
      wardAssigned: official.wardAssigned,
    };
    const token = await signJWT(payload);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("official_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      official: {
        name: official.name,
        department: official.department,
        email: official.email,
        wardAssigned: official.wardAssigned,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
