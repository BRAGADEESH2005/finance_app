import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import LifeLog from "@/models/LifeLog";
import { getCurrentUser } from "@/lib/auth";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  context: Context
) {
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
        { error: "Invalid entry ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const deleted = await LifeLog.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Entry not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete life log entry:", error);

    return NextResponse.json(
      { error: "Unable to delete entry." },
      { status: 500 }
    );
  }
}