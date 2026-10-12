import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    await connectDB();

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      user: {
        id: String(user._id),
        username: user.username,
        cycleStartDay: user.cycleStartDay,
        onboardingComplete: user.onboardingComplete,
      },
      transactions: transactions.map((transaction) => ({
        id: String(transaction._id),
        kind: transaction.kind,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        note: transaction.note,
      })),
    });
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    return NextResponse.json(
      { error: "Unable to load your dashboard." },
      { status: 500 },
    );
  }
}
