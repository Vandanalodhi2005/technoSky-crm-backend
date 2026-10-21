import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertSessionSecret,
  hasTrustedOrigin,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
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

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email and password." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: parsed.data.email }).select(
      "+passwordHash name email isActive"
    );

    if (
      !user ||
      !user.isActive ||
      !(await verifyPassword(parsed.data.password, user.passwordHash))
    ) {
      return NextResponse.json(
        { success: false, message: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, email: user.email },
    });

    return setSessionCookie(response, user._id);
  } catch (error) {
    console.error(
      "Login failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to sign in." },
      { status: 500 }
    );
  }
}
