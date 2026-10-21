import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "crm_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 random bytes.");
  }

  return secret;
}

export function assertSessionSecret() {
  getSessionSecret();
}

export function getTrustedFrontendOrigin() {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const url = new URL(frontendUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("FRONTEND_URL must use HTTP or HTTPS.");
    }

    return url.origin;
  } catch {
    throw new Error("FRONTEND_URL must be a valid HTTP or HTTPS URL.");
  }
}

export function hasTrustedOrigin(request) {
  try {
    return request.headers.get("origin") === getTrustedFrontendOrigin();
  } catch {
    return false;
  }
}

function hashOtp(otp) {
  return createHmac("sha256", getSessionSecret()).update(otp).digest("hex");
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return `scrypt:${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, expectedHex] = storedHash.split(":");

  if (
    algorithm !== "scrypt" ||
    !salt ||
    !/^[a-f0-9]{128}$/i.test(expectedHex || "")
  ) {
    return false;
  }

  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, "hex");

  return timingSafeEqual(actual, expected);
}

export function createOtpHash(otp) {
  return hashOtp(otp);
}

export function verifyOtpHash(otp, expectedHash) {
  const actual = Buffer.from(hashOtp(otp), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

function createSessionToken(sessionData) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ ...sessionData, expiresAt })
  ).toString("base64url");
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  return { token: `${payload}.${signature}`, expiresAt };
}

export function setSessionCookie(response, userId) {
  const { token, expiresAt } = createSessionToken({
    userId: userId.toString(),
    role: "user",
  });

  return writeSessionCookie(response, token, expiresAt);
}

export function setAdminSessionCookie(response, username) {
  const { token, expiresAt } = createSessionToken({
    role: "admin",
    username,
  });

  return writeSessionCookie(response, token, expiresAt);
}

function writeSessionCookie(response, token, expiresAt) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt * 1000),
  });

  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function getSessionData(token) {
  const [payload, signature, extra] = token.split(".");

  if (!payload || !signature || extra) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest();
  const actualSignature = Buffer.from(signature, "base64url");

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    if (
      session.role === "admin" &&
      typeof session.username === "string"
    ) {
      return { role: "admin", username: session.username };
    }

    if (typeof session.userId === "string") {
      return { role: "user", userId: session.userId };
    }

    return null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = getSessionData(token);

  if (!session) {
    return null;
  }

  if (session.role === "admin") {
    return {
      name: "Administrator",
      email: session.username,
      role: "admin",
    };
  }

  await connectDB();
  const user = await User.findById(session.userId)
    .select("name email isActive")
    .lean();

  return user && user.isActive !== false
    ? { ...user, role: "user" }
    : null;
}
