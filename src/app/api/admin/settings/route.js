import { NextResponse } from "next/server";
import { getTrustedFrontendOrigin } from "@/lib/auth";
import { logAdminError, requireAdmin } from "@/lib/admin-api";

export async function GET() {
  try {
    const { response, user } = await requireAdmin();

    if (response) {
      return response;
    }

    return NextResponse.json({
      success: true,
      data: {
        adminUsername: user.email,
        frontendOrigin: getTrustedFrontendOrigin(),
        databaseConfigured: Boolean(process.env.MONGODB_URI),
        emailDeliveryConfigured: Boolean(
          process.env.SMTP_HOST &&
          process.env.SMTP_PORT &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASS &&
          (process.env.SMTP_FROM || process.env.SMTP_USER)
        ),
        sessionDurationDays: 7,
        accountRegistrationEnabled: true,
      },
    });
  } catch (error) {
    return logAdminError("Load admin settings", error);
  }
}
