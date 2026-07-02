import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("official_session", "", {
      maxAge: 0,
      path: "/",
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
