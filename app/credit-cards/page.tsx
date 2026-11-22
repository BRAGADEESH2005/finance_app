"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/mobile-nav";
import LoadingState from "@/components/loading-state";
import { getFinancialPeriod } from "@/lib/financial-period";

type CreditCardTransaction = {
  id: string;
  cardName: string;
  amount: number;
  category: string;
  date: string;
  merchant: string;
  note: string;
};

const categories = [
  "Groceries",
  "Food & restaurants",
  "Shopping",
  "Travel",
  "Fuel",
  "Bills & subscriptions",
  "Entertainment",
  "Health",
  "Personal care",
  "Other",
];

function localDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function money(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

function ordinal(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

export default function CreditCardsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([]);
  const [cardName, setCardName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [cycleStartDay, setCycleStartDay] = useState(18);
  const [selectedCycleStart, setSelectedCycleStart] = useState("");
  const [search, setSearch] = useState("");
  const [cardFilter, setCardFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dateFromString = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meResponse, transactionResponse] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/credit-card-transactions"),
      ]);
      if (meResponse.status === 401 || transactionResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (!meResponse.ok || !transactionResponse.ok) {
        throw new Error("Could not load credit-card activity.");
      }
      const me = await meResponse.json();
      const result = await transactionResponse.json();
      const startDay = me.creditCycleStartDay ?? 18;
      const period = getFinancialPeriod(startDay);
      setCycleStartDay(startDay);
      setSelectedCycleStart(period.startDate);
      setTransactions(result.transactions);
      setDate(period.startDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!date && selectedCycleStart) setDate(localDateString());
  }, [date, selectedCycleStart]);

  const period = useMemo(() => {
    if (!selectedCycleStart) {
      return { startDate: "", endDate: "", label: "Loading credit cycle..." };
    }
    return getFinancialPeriod(cycleStartDay, dateFromString(selectedCycleStart));
  }, [cycleStartDay, selectedCycleStart]);

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.date >= period.startDate &&
          transaction.date <= period.endDate,
      ),
    [transactions, period],
  );

  const visibleTransactions = useMemo(
    () =>
      periodTransactions.filter((transaction) => {
        const text = `${transaction.cardName} ${transaction.category} ${transaction.merchant} ${transaction.note} ${transaction.date}`.toLowerCase();
        return (
          (cardFilter === "All" || transaction.cardName === cardFilter) &&
          (categoryFilter === "All" || transaction.category === categoryFilter) &&
          (!dateFrom || transaction.date >= dateFrom) &&
          (!dateTo || transaction.date <= dateTo) &&
          text.includes(search.toLowerCase())
        );
      }),
    [periodTransactions, cardFilter, categoryFilter, dateFrom, dateTo, search],
  );

  const total = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const filteredCardNames = [...new Set(periodTransactions.map((transaction) => transaction.cardName))].sort();
  const categoryNames = [...new Set(periodTransactions.map((transaction) => transaction.category))].sort();

  function shiftCycle(months: number) {
    if (!selectedCycleStart) return;
    const date = dateFromString(selectedCycleStart);
    date.setMonth(date.getMonth() + months);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setSelectedCycleStart(value);
  }

  async function saveSetting(nextDay: number) {
    setCycleStartDay(nextDay);
    setError("");
    try {
      const response = await fetch("/api/credit-card-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditCycleStartDay: nextDay }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save cycle setting.");
      const period = getFinancialPeriod(nextDay);
      setSelectedCycleStart(period.startDate);
      setSuccess("Credit-card cycle updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save cycle setting.");
    }
  }

  async function addTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const numericAmount = Number(amount);
    if (!cardName.trim()) {
      setError("Enter the card name.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (date < period.startDate || date > period.endDate) {
      setError("Choose a date within the selected credit-card cycle.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/credit-card-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName,
          amount: numericAmount,
          category,
          date,
          merchant,
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save transaction.");
      setTransactions((previous) => [data, ...previous]);
      setAmount("");
      setMerchant("");
      setNote("");
      setSuccess("Credit-card transaction saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm("Delete this credit-card transaction?")) return;
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/credit-card-transactions/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete transaction.");
      setTransactions((previous) => previous.filter((transaction) => transaction.id !== id));
      setSuccess("Transaction deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete transaction.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <MobileNav />
        <LoadingState label="Loading credit cards..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 sm:pb-8">
      <MobileNav />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-5 sm:py-8">
        <Link href="/" className="text-sm font-semibold text-emerald-700">
          ← Back to dashboard
        </Link>

        <section className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm text-slate-300">Credit-card cycle</p>
              <h1 className="mt-2 text-2xl font-bold">{period.label}</h1>
              <p className="mt-2 text-sm text-slate-300">
                Transactions from the {ordinal(cycleStartDay)} to the end of the next cycle.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="credit-cycle-setting" className="text-xs text-slate-300">
                Cycle starts
              </label>
              <select
                id="credit-cycle-setting"
                value={cycleStartDay}
                onChange={(event) => void saveSetting(Number(event.target.value))}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
              >
                {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>{ordinal(day)}</option>
                ))}
              </select>
              <button type="button" onClick={() => shiftCycle(-1)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
                Previous
              </button>
              <button type="button" onClick={() => shiftCycle(1)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
                Next
              </button>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-700 pt-5">
            <p className="text-sm text-slate-300">Cycle spending</p>
            <p className="mt-1 text-3xl font-bold">{money(total)}</p>
            <p className="mt-2 text-xs text-slate-400">
              {periodTransactions.length} transaction{periodTransactions.length === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </p>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={addTransaction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">Add credit-card transaction</h2>
              <p className="mt-1 text-sm text-slate-500">Record a purchase in this separate card ledger.</p>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Card name
              <input
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                required
                maxLength={60}
                placeholder="HDFC Regalia"
                className="w-full rounded-lg border px-3 py-3 font-normal"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Amount (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                placeholder="e.g. 1499"
                className="w-full rounded-lg border px-3 py-3 font-normal"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border bg-white px-3 py-3 font-normal">
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Merchant (optional)
              <input value={merchant} onChange={(event) => setMerchant(event.target.value)} maxLength={100} placeholder="Amazon, Swiggy..." className="w-full rounded-lg border px-3 py-3 font-normal" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Date
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} min={period.startDate} max={period.endDate} required className="w-full rounded-lg border px-3 py-3 font-normal" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Note (optional)
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Anything you want to remember" className="w-full rounded-lg border px-3 py-3 font-normal" />
            </label>
            <button disabled={saving || !date} className="w-full rounded-lg bg-violet-700 px-4 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? "Saving..." : "Save credit-card transaction"}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Credit-card history</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search card, merchant or note..." className="rounded-lg border px-3 py-3 text-sm" />
              <select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-3 text-sm">
                <option value="All">All cards</option>
                {filteredCardNames.map((name) => <option key={name}>{name}</option>)}
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-3 text-sm">
                <option value="All">All categories</option>
                {categoryNames.map((name) => <option key={name}>{name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="rounded-lg border px-2 py-3 text-sm" aria-label="From date" />
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="rounded-lg border px-2 py-3 text-sm" aria-label="To date" />
              </div>
            </div>

            {(search || cardFilter !== "All" || categoryFilter !== "All" || dateFrom || dateTo) && (
              <button type="button" onClick={() => { setSearch(""); setCardFilter("All"); setCategoryFilter("All"); setDateFrom(""); setDateTo(""); }} className="mt-3 text-sm font-semibold text-violet-700 hover:underline">
                Clear filters
              </button>
            )}

            {visibleTransactions.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center">
                <p className="font-medium">No credit-card transactions found</p>
                <p className="mt-2 text-sm text-slate-500">Add a purchase or adjust the filters.</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {visibleTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{transaction.cardName} · {transaction.category}</p>
                      <p className="mt-1 text-xs text-slate-500">{transaction.date}{transaction.merchant ? ` · ${transaction.merchant}` : ""}</p>
                      {transaction.note && <p className="mt-1 truncate text-sm text-slate-500">{transaction.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-violet-700">{money(transaction.amount)}</span>
                      <button type="button" onClick={() => void deleteTransaction(transaction.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
