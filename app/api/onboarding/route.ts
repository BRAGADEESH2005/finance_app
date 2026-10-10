import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Please log in first." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const startDay = Number(body.startDay);

    if (
      !Number.isInteger(startDay) ||
      startDay < 1 ||
      startDay > 28
    ) {
      return NextResponse.json(
        { error: "Choose a start day between 1 and 28." },
        { status: 400 }
      );
    }

    await connectDB();

    await User.updateOne(
      { _id: currentUser._id },
      {
        $set: {
          cycleStartDay: startDay,
          onboardingComplete: true,
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not save your preferences." },
      { status: 500 }
    );
  }
}