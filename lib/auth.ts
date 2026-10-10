import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import User from "@/models/User";

const COOKIE_NAME = "finance_session";
const SESSION_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  await connectDB();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  );

  await Session.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  await connectDB();

  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!session) return null;

  return User.findById(session.userId)
    .select("_id username cycleStartDay onboardingComplete")
    .lean();
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}