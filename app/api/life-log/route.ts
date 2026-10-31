import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LifeLog from "@/models/LifeLog";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in." },
        { status: 401 }
      );
    }

    await connectDB();

    const entries = await LifeLog.find({
      userId: user._id,
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: String(entry._id),
        date: entry.date,
        event: entry.event,
        amount: entry.amount,
        note: entry.note,
      })),
    });
  } catch (error) {
    console.error("Failed to load life log:", error);

    return NextResponse.json(
      { error: "Unable to load your entries." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { date, event, note = "" } = body;

    const amount =
      body.amount === null ||
      body.amount === undefined ||
      body.amount === ""
        ? null
        : Number(body.amount);

    if (
      typeof event !== "string" ||
      !event.trim() ||
      event.trim().length > 150
    ) {
      return NextResponse.json(
        { error: "Enter a valid event name." },
        { status: 400 }
      );
    }

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !isValidDate(date)
    ) {
      return NextResponse.json(
        { error: "Enter a valid date." },
        { status: 400 }
      );
    }

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount < 0)
    ) {
      return NextResponse.json(
        { error: "Enter a valid amount." },
        { status: 400 }
      );
    }

    if (
      typeof note !== "string" ||
      note.length > 500
    ) {
      return NextResponse.json(
        { error: "Notes must be 500 characters or fewer." },
        { status: 400 }
      );
    }

    await connectDB();

    const entry = await LifeLog.create({
      userId: user._id,
      date,
      event: event.trim(),
      amount,
      note: note.trim(),
    });

    return NextResponse.json(
      {
        id: String(entry._id),
        date: entry.date,
        event: entry.event,
        amount: entry.amount,
        note: entry.note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create life log entry:", error);

    return NextResponse.json(
      { error: "Unable to save your entry." },
      { status: 500 }
    );
  }
}

function isValidDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}