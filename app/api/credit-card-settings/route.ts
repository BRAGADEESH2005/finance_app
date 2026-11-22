import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const creditCycleStartDay = Number(body.creditCycleStartDay);
    if (
      !Number.isInteger(creditCycleStartDay) ||
      creditCycleStartDay < 1 ||
      creditCycleStartDay > 28
    ) {
      return NextResponse.json(
        { error: "Choose a cycle start day between 1 and 28." },
        { status: 400 },
      );
    }

    await connectDB();
    await User.updateOne(
      { _id: user._id },
      { $set: { creditCycleStartDay } },
    );

    return NextResponse.json({ creditCycleStartDay });
  } catch (error) {
    console.error("Failed to save credit-card settings:", error);
    return NextResponse.json(
      { error: "Unable to save credit-card settings." },
      { status: 500 },
    );
  }
}
