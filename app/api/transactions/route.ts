import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getCurrentUser } from "@/lib/auth";

const allowedKinds = ["Income", "Expense", "Investment"];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in." },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") || 50), 1),
      100,
    );
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const kind = searchParams.get("kind");
    const search = searchParams.get("search")?.trim();
    const query: Record<string, unknown> = { userId: user._id };

    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      query.date = { ...(query.date as object), $gte: startDate };
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      query.date = { ...(query.date as object), $lte: endDate };
    }
    if (["Income", "Expense", "Investment"].includes(kind || "")) {
      query.kind = kind;
    }
    if (search) {
      query.$or = [
        { category: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        transactions: transactions.map((t) => ({
          id: String(t._id),
          kind: t.kind,
          amount: t.amount,
          category: t.category,
          date: t.date,
          note: t.note,
        })),
        pagination: {
          page,
          pageSize,
          total,
          hasMore: page * pageSize < total,
        },
      },
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