import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSessionSecret, createOtpHash, hashPassword, hasTrustedOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  getMissingRegistrationMailSettings,
  sendRegistrationOtp,
} from "@/lib/registration-email";
import PendingRegistration from "@/models/pendingRegistration";
import User from "@/models/user";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
});

const RESEND_INTERVAL_MS = 60 * 1000;
const OTP_LIFETIME_MS = 10 * 60 * 1000;

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
    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid name, email, and password of at least 12 characters.",
        },
        { status: 400 }
      );
    }

    const missingMailSettings = getMissingRegistrationMailSettings();

    if (missingMailSettings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Email delivery is not configured. Set ${missingMailSettings.join(", ")} in backend/my-app/.env.local and restart the backend.`,
        },
        { status: 503 }
      );
    }

    await connectDB();

    const { name, email, password } = parsed.data;
    const existingUser = await User.exists({ email });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "If this email can be registered, a verification code will be sent.",
      });
    }

    const now = new Date();
    const pending = await PendingRegistration.findOne({ email });

    if (
      pending &&
      now.getTime() - pending.lastSentAt.getTime() < RESEND_INTERVAL_MS
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please wait before requesting another verification code.",
        },
        { status: 429 }
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    const pendingRegistration = await PendingRegistration.findOneAndUpdate(
      { email },
      {
        name,
        email,
        passwordHash: await hashPassword(password),
        otpHash: createOtpHash(otp),
        expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
        lastSentAt: now,
        attempts: 0,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    try {
      await sendRegistrationOtp(email, otp);
    } catch (error) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      console.error(
        "Registration email delivery failed:",
        error instanceof Error ? error.name : "UnknownError",
        error && typeof error === "object" && "code" in error
          ? error.code
          : "NoErrorCode",
        error && typeof error === "object" && "responseCode" in error
          ? error.responseCode
          : "NoSmtpResponseCode"
      );

      return NextResponse.json(
        {
          success: false,
          message: "The email provider rejected or could not deliver the verification email. Check the backend SMTP host, port, credentials, and verified sender.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If this email can be registered, a verification code will be sent.",
    });
  } catch (error) {
    console.error(
      "Registration code request failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to start registration." },
      { status: 500 }
    );
  }
}
