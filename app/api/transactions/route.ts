import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getCurrentUser } from "@/lib/auth";

const allowedKinds = ["Income", "Expense", "Investment"];

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

    const transactions = await Transaction.find({
      userId: user._id,
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json(
      transactions.map((t) => ({
        id: String(t._id),
        kind: t.kind,
        amount: t.amount,
        category: t.category,
        date: t.date,
        note: t.note,
      }))
    );
  } catch (error) {
    console.error("Failed to load transactions:", error);

    return NextResponse.json(
      { error: "Unable to load transactions." },
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

    const { kind, amount, category, date, note = "" } = body;

    if (!allowedKinds.includes(kind)) {
      return NextResponse.json(
        { error: "Invalid transaction type." },
        { status: 400 }
      );
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid positive amount." },
        { status: 400 }
      );
    }

    if (
      typeof category !== "string" ||
      !category.trim() ||
      category.trim().length > 60
    ) {
      return NextResponse.json(
        { error: "Enter a valid category." },
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
      typeof note !== "string" ||
      note.length > 200
    ) {
      return NextResponse.json(
        { error: "The note must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    await connectDB();

    const transaction = await Transaction.create({
      // Never accept userId from the browser.
      userId: user._id,
      kind,
      amount,
      category: category.trim(),
      date,
      note: note.trim(),
    });

    return NextResponse.json(
      {
        id: String(transaction._id),
        kind: transaction.kind,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        note: transaction.note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create transaction:", error);

    return NextResponse.json(
      { error: "Unable to save transaction." },
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