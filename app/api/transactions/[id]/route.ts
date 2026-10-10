import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getCurrentUser } from "@/lib/auth";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!deleted) {
      // Don't disclose whether another user's transaction exists.
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete transaction:", error);

    return NextResponse.json(
      { error: "Unable to delete transaction." },
      { status: 500 }
    );
  }
}