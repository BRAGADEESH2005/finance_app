import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CreditCardTransaction from "@/models/CreditCardTransaction";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const cardName = searchParams.get("cardName");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const query: Record<string, unknown> = { userId: user._id };

    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      query.date = { ...(query.date as object), $gte: startDate };
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      query.date = { ...(query.date as object), $lte: endDate };
    }
    if (cardName) query.cardName = cardName;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { cardName: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { merchant: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    const transactions = await CreditCardTransaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: String(transaction._id),
        cardName: transaction.cardName,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        merchant: transaction.merchant,
        note: transaction.note,
      })),
    });
  } catch (error) {
    console.error("Failed to load credit-card transactions:", error);
    return NextResponse.json(
      { error: "Unable to load credit-card transactions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const {
      cardName,
      amount,
      category,
      date,
      merchant = "",
      note = "",
    } = body;

    if (typeof cardName !== "string" || !cardName.trim() || cardName.trim().length > 60) {
      return NextResponse.json({ error: "Enter a valid card name." }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid positive amount." }, { status: 400 });
    }
    if (typeof category !== "string" || !category.trim() || category.trim().length > 60) {
      return NextResponse.json({ error: "Enter a valid category." }, { status: 400 });
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidDate(date)) {
      return NextResponse.json({ error: "Enter a valid date." }, { status: 400 });
    }
    if (typeof merchant !== "string" || merchant.length > 100) {
      return NextResponse.json({ error: "The merchant must be 100 characters or fewer." }, { status: 400 });
    }
    if (typeof note !== "string" || note.length > 200) {
      return NextResponse.json({ error: "The note must be 200 characters or fewer." }, { status: 400 });
    }

    await connectDB();
    const transaction = await CreditCardTransaction.create({
      userId: user._id,
      cardName: cardName.trim(),
      amount,
      category: category.trim(),
      date,
      merchant: merchant.trim(),
      note: note.trim(),
    });

    return NextResponse.json(
      {
        id: String(transaction._id),
        cardName: transaction.cardName,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        merchant: transaction.merchant,
        note: transaction.note,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create credit-card transaction:", error);
    return NextResponse.json(
      { error: "Unable to save credit-card transaction." },
      { status: 500 },
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
