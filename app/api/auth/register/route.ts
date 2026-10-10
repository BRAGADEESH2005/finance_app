 import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3–30 characters: letters, numbers or underscores." },
        { status: 400 }
      );
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters and no more than 72 UTF-8 bytes." },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.exists({ username });

    if (existingUser) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      passwordHash,
      onboardingComplete: false,
    });

    await createSession(String(user._id));

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    // The unique MongoDB index also protects against concurrent signups.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { error: "Unable to register right now." },
      { status: 500 }
    );
  }
}