"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getFinancialPeriod } from "@/lib/financial-period";

type Kind = "Income" | "Expense" | "Investment";

type Transaction = {
  id: string;
  kind: Kind;
  amount: number;
  category: string;
  date: string;
  note: string;
};

type User = {
  id: string;
  username: string;
  cycleStartDay: number;
  onboardingComplete: boolean;
};

const categories: Record<Kind, string[]> = {
  Income: ["Salary", "Bonus", "Other income"],
  Expense: [
    "Rent",
    "Maintenance",
    "Groceries",
    "Food & restaurants",
    "Tea & snacks",
    "Cinema",
    "Sports & games",
    "Shopping",
    "Transport",
    "Fuel",
    "Bills & subscriptions",
    "Travel",
    "Personal care",
    "Medical",
    "Other",
  ],
  Investment: [
    "Gold",
    "Stocks",
    "Mutual funds",
    "FD",
    "RD",
    "Other investment",
  ],
};

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftCycleStart(value: string, months: number) {
  const date = dateFromString(value);
  date.setMonth(date.getMonth() + months);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

const loadingPeriod = {
  startDate: "",
  endDate: "",
  label: "Loading financial month...",
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kind, setKind] = useState<Kind>("Expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Rent");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCycleStart, setSelectedCycleStart] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setDate(localDateString());
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const userResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (userResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!userResponse.ok) {
        throw new Error("Could not load your account.");
      }

      const currentUser: User = await userResponse.json();

      if (!currentUser.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }

      setUser(currentUser);
      setSelectedCycleStart(
        getFinancialPeriod(currentUser.cycleStartDay).startDate,
      );

      const transactionResponse = await fetch("/api/transactions", {
        cache: "no-store",
      });

      if (transactionResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!transactionResponse.ok) {
        throw new Error("Could not load transactions.");
      }

      const result: Transaction[] = await transactionResponse.json();
      setTransactions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const financialPeriod = useMemo(() => {
    if (!selectedCycleStart) return loadingPeriod;

    return getFinancialPeriod(
      user?.cycleStartDay ?? 26,
      dateFromString(selectedCycleStart),
    );
  }, [selectedCycleStart, user?.cycleStartDay]);

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.date >= financialPeriod.startDate &&
          transaction.date <= financialPeriod.endDate,
      ),
    [transactions, financialPeriod],
  );

  const totalIncome = periodTransactions
    .filter((t) => t.kind === "Income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = periodTransactions
    .filter((t) => t.kind === "Expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInvestments = periodTransactions
    .filter((t) => t.kind === "Investment")
    .reduce((sum, t) => sum + t.amount, 0);

  const unallocatedCash = totalIncome - totalExpenses - totalInvestments;

  function downloadCycle() {
    const headers = ["Date", "Type", "Category", "Amount", "Note"];
    const rows = periodTransactions.map((transaction) => [
      transaction.date,
      transaction.kind,
      transaction.category,
      transaction.amount.toFixed(2),
      transaction.note,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `transactions-${financialPeriod.startDate}-to-${financialPeriod.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          amount: numericAmount,
          category,
          date,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save transaction.");
      }

      setTransactions((previous) => [data, ...previous]);
      setAmount("");
      setNote("");
      setSuccess("Transaction saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save transaction.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm("Delete this transaction?")) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete transaction.");
      }

      setTransactions((previous) =>
        previous.filter((transaction) => transaction.id !== id),
      );
      setSuccess("Transaction deleted.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete transaction.",
      );
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const cards = [
    {
      title: "Total income",
      kind: "Income",
      value: totalIncome,
      symbol: "↗",
      color: "text-emerald-700",
      description: "Money received this cycle",
    },
    {
      title: "Total expenses",
      kind: "Expense",
      value: totalExpenses,
      symbol: "↘",
      color: "text-rose-600",
      description: "Money spent this cycle",
    },
    {
      title: "Investments",
      kind: "Investment",
      value: totalInvestments,
      symbol: "◈",
      color: "text-violet-700",
      description: "Money invested this cycle",
    },
    {
      title: "Unallocated cash",
      kind: "Unallocated",
      value: unallocatedCash,
      symbol: "₹",
      color: "text-slate-900",
      description: "Income minus expenses and investments",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-emerald-700">
              MY FINANCE
            </p>
            <h1 className="mt-1 text-2xl font-bold">Money dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {user ? `Welcome, ${user.username}` : "Your personal finances"}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        <section className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">Your financial month</p>
              <h2 className="mt-2 text-2xl font-bold">
                {financialPeriod.label}
              </h2>
            </div>
            <div
              className="flex items-center gap-2"
              aria-label="Financial month navigation"
            >
              <label htmlFor="cycle-month" className="sr-only">
                Jump to month
              </label>
              <input
                id="cycle-month"
                type="month"
                value={selectedCycleStart.slice(0, 7)}
                onChange={(event) => {
                  const cycleMonth = event.target.value;

                  if (cycleMonth) {
                    const cycleDay = String(user?.cycleStartDay ?? 26).padStart(
                      2,
                      "0",
                    );
                    setSelectedCycleStart(`${cycleMonth}-${cycleDay}`);
                  }
                }}
                disabled={!selectedCycleStart}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedCycleStart((current) =>
                    current ? shiftCycleStart(current, -1) : current,
                  )
                }
                disabled={!selectedCycleStart}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedCycleStart((current) =>
                    current ? shiftCycleStart(current, 1) : current,
                  )
                }
                disabled={!selectedCycleStart}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Your totals follow your personal financial cycle, not the calendar
            month.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadCycle}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Download transactions (CSV)
            </button>
            <button
              type="button"
              onClick={() => router.push("/onboarding?edit=1")}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Change financial-month settings
            </button>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {success}
          </p>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Your financial summary</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select any card to explore the details.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <button
                key={card.kind}
                type="button"
                onClick={() =>
                  router.push(
                    `/details/${card.kind}?cycleStart=${selectedCycleStart}`,
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {card.title}
                  </span>
                  <span className={`text-xl ${card.color}`}>{card.symbol}</span>
                </div>
                <p
                  className={`mt-4 wrap-break-word text-2xl font-bold ${card.color}`}
                >
                  {money(card.value)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {financialPeriod.label}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {card.description} · View details →
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={addTransaction}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-bold">Add a transaction</h2>
              <p className="mt-1 text-sm text-slate-500">
                Record income, spending or investments.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="kind" className="text-sm font-medium">
                Transaction type
              </label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => {
                  const nextKind = e.target.value as Kind;
                  setKind(nextKind);
                  setCategory(categories[nextKind][0]);
                }}
                className="w-full rounded-lg border px-3 py-3"
              >
                {(["Income", "Expense", "Investment"] as Kind[]).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (₹)
              </label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full rounded-lg border px-3 py-3"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border px-3 py-3"
              >
                {categories[kind].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-3"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Note (optional)
              </label>
              <input
                id="note"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was this transaction for?"
                className="w-full rounded-lg border px-3 py-3"
              />
            </div>

            <button
              disabled={saving || !date}
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save transaction"}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Recent transactions</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Transactions in your current financial month.
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(`/details/All?cycleStart=${selectedCycleStart}`)
                }
                className="shrink-0 text-sm font-semibold text-emerald-700 hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <p className="py-8 text-sm text-slate-500">
                Loading your transactions...
              </p>
            ) : periodTransactions.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center">
                <p className="font-medium">No transactions in this cycle yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Add your first transaction using the form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {periodTransactions.slice(0, 8).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {transaction.category}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {transaction.date} · {transaction.kind}
                      </p>
                      {transaction.note && (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {transaction.note}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          transaction.kind === "Income"
                            ? "text-emerald-700"
                            : transaction.kind === "Expense"
                              ? "text-rose-600"
                              : "text-violet-700"
                        }`}
                      >
                        {transaction.kind === "Income" ? "+" : "−"}
                        {money(transaction.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteTransaction(transaction.id)}
                        aria-label={`Delete ${transaction.category}`}
                        className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <p className="pb-6 text-center text-xs text-slate-400">
          Unallocated cash is a calculation, not a live bank balance.
        </p>
      </div>
    </main>
  );
}
