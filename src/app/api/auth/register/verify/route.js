import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertSessionSecret,
  hasTrustedOrigin,
  setSessionCookie,
  verifyOtpHash,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PendingRegistration from "@/models/pendingRegistration";
import User from "@/models/user";

const verificationSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  otp: z.string().regex(/^\d{6}$/),
});

const MAX_OTP_ATTEMPTS = 5;

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
    const parsed = verificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email and six-digit verification code." },
        { status: 400 }
      );
    }

    await connectDB();

    const { email, otp } = parsed.data;
    const pending = await PendingRegistration.findOne({ email });

    if (
      !pending ||
      pending.expiresAt.getTime() <= Date.now() ||
      pending.attempts >= MAX_OTP_ATTEMPTS
    ) {
      return NextResponse.json(
        { success: false, message: "The verification code is invalid or expired." },
        { status: 400 }
      );
    }

    if (!verifyOtpHash(otp, pending.otpHash)) {
      await PendingRegistration.updateOne(
        { _id: pending._id, attempts: pending.attempts },
        { $inc: { attempts: 1 } }
      );

      return NextResponse.json(
        { success: false, message: "The verification code is invalid or expired." },
        { status: 400 }
      );
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      emailVerifiedAt: new Date(),
    });

    await PendingRegistration.deleteOne({ _id: pending._id });

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, email: user.email },
    });

    return setSessionCookie(response, user._id);
  } catch (error) {
    console.error(
      "Registration verification failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to verify registration." },
      { status: 500 }
    );
  }
}
