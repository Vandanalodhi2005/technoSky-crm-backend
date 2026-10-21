import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasTrustedOrigin } from "@/lib/auth";

export async function requireAdmin() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Administrator access required." },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

export function requireTrustedOrigin(request) {
  if (hasTrustedOrigin(request)) {
    return null;
  }

  return NextResponse.json(
    { success: false, message: "Request origin is not allowed." },
    { status: 403 }
  );
}

export function logAdminError(action, error) {
  console.error(
    `${action} failed:`,
    error instanceof Error ? error.name : "UnknownError"
  );

  return NextResponse.json(
    { success: false, message: `Unable to ${action.toLowerCase()}.` },
    { status: 500 }
  );
}
