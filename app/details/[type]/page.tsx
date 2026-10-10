"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

const validTypes = ["Income", "Expense", "Investment", "Unallocated", "All"];

function money(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

function dateFromString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const loadingPeriod = {
  startDate: "",
  endDate: "",
  label: "Loading financial month...",
};

function TransactionDetailsContent() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = decodeURIComponent(params.type);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentCycleStart, setCurrentCycleStart] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
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
        throw new Error("Unable to load your account.");
      }

      const currentUser: User = await userResponse.json();

      if (!currentUser.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }

      setUser(currentUser);
      setCurrentCycleStart(
        getFinancialPeriod(currentUser.cycleStartDay).startDate,
      );

      const response = await fetch("/api/transactions", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load transactions.");
      }

      setTransactions(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!validTypes.includes(type)) {
      router.replace("/");
      return;
    }

    void load();
  }, [type, load, router]);

  const period = useMemo(() => {
    const cycleStart = searchParams.get("cycleStart") || currentCycleStart;

    if (!cycleStart) return loadingPeriod;

    return getFinancialPeriod(
      user?.cycleStartDay ?? 26,
      dateFromString(cycleStart),
    );
  }, [currentCycleStart, searchParams, user?.cycleStartDay]);

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.date >= period.startDate && t.date <= period.endDate,
      ),
    [transactions, period],
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

  const total =
    type === "Income"
      ? totalIncome
      : type === "Expense"
        ? totalExpenses
        : type === "Investment"
          ? totalInvestments
          : type === "Unallocated"
            ? totalIncome - totalExpenses - totalInvestments
            : periodTransactions.length;

  const categories = [
    ...new Set(
      periodTransactions
        .filter(
          (t) => type === "All" || type === "Unallocated" || t.kind === type,
        )
        .map((t) => t.category),
    ),
  ].sort();

  const visibleTransactions = periodTransactions.filter((t) => {
    const matchesType =
      type === "All" || type === "Unallocated" || t.kind === type;
    const matchesCategory =
      categoryFilter === "All" || t.category === categoryFilter;
    const searchText =
      `${t.category} ${t.note} ${t.date} ${t.kind}`.toLowerCase();
    const matchesSearch = searchText.includes(search.toLowerCase());

    return matchesType && matchesCategory && matchesSearch;
  });

  const title =
    type === "All"
      ? "All transactions"
      : type === "Unallocated"
        ? "Unallocated cash"
        : `Total ${type.toLowerCase()}`;

  const categoryTotals = visibleTransactions.reduce<Record<string, number>>(
    (totals, transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] || 0) + transaction.amount;
      return totals;
    },
    {},
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm("Delete this transaction?")) return;

    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not delete transaction.");
      return;
    }

    setTransactions((previous) => previous.filter((t) => t.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-700">
              MY FINANCE
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {user ? `Welcome, ${user.username}` : "Your finances"}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <Link href="/" className="text-sm font-semibold text-emerald-700">
          ← Back to dashboard
        </Link>

        <section className="rounded-2xl bg-slate-900 p-6 text-white">
          <p className="text-sm text-slate-300">Financial period</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-300">{period.label}</p>
          {type === "Unallocated" ? (
            <div className="mt-5">
              <p className="text-sm text-slate-300">
                Income − expenses − investments
              </p>
              <p className="mt-1 text-3xl font-bold">{money(total)}</p>
              <p className="mt-2 text-xs text-slate-300">
                This is an estimate, not your actual bank balance.
              </p>
            </div>
          ) : (
            <p className="mt-5 text-3xl font-bold">
              {type === "All" ? `${total} transactions` : money(total)}
            </p>
          )}
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        {type !== "Unallocated" && (
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Category breakdown</h2>
            {Object.keys(categoryTotals).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No matching transactions to summarize.
              </p>
            ) : (
              <div className="mt-3 divide-y">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, value]) => (
                    <div
                      key={name}
                      className="flex justify-between gap-4 py-3 text-sm"
                    >
                      <span>{name}</span>
                      <span className="font-semibold">{money(value)}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Transaction history</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category, note or date..."
              className="rounded-lg border px-3 py-3 text-sm"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border bg-white px-3 py-3 text-sm"
            >
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-slate-500">
              Loading transactions...
            </p>
          ) : type === "Unallocated" ? (
            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Unallocated cash is calculated from the totals above. It is not a
              separate type of transaction.
            </div>
          ) : visibleTransactions.length === 0 ? (
            <p className="py-8 text-sm text-slate-500">
              No transactions match your filters.
            </p>
          ) : (
            <div className="mt-4 divide-y">
              {visibleTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.category}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.date} · {t.kind}
                    </p>
                    {t.note && (
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {t.note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold">{money(t.amount)}</span>
                    <button
                      onClick={() => void deleteTransaction(t.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function TransactionDetailsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading transactions...</p>}>
      <TransactionDetailsContent />
    </Suspense>
  );
}
