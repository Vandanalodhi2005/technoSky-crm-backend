import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertSessionSecret,
  hasTrustedOrigin,
  setAdminSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
});

export async function POST(request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  try {
    assertSessionSecret();

    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!configuredUsername || !configuredPasswordHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in the backend environment.",
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Enter an admin username and password." },
        { status: 400 }
      );
    }

    const usernameMatches =
      parsed.data.username === configuredUsername &&
      configuredUsername === "admin";
    const passwordMatches = await verifyPassword(
      parsed.data.password,
      configuredPasswordHash
    );

    if (!usernameMatches || !passwordMatches) {
      return NextResponse.json(
        { success: false, message: "Admin username or password is incorrect." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: { name: "Administrator", username: configuredUsername, role: "admin" },
    });

    return setAdminSessionCookie(response, configuredUsername);
  } catch (error) {
    console.error(
      "Admin login failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to sign in as admin." },
      { status: 500 }
    );
  }
}
