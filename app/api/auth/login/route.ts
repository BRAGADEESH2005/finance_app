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

    await connectDB();

    const user = await User.findOne({ username }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    await createSession(String(user._id));

    return NextResponse.json({
      ok: true,
      onboardingComplete: user.onboardingComplete,
    });
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      { error: "Unable to log in right now." },
      { status: 500 }
    );
  }
}