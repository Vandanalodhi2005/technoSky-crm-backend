import { NextResponse } from "next/server";
import { clearSessionCookie, hasTrustedOrigin } from "@/lib/auth";

export async function POST(request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  return clearSessionCookie(
    NextResponse.json({ success: true, message: "Signed out." })
  );
}
