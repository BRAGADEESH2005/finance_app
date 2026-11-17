"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getFinancialPeriod } from "@/lib/financial-period";
import MobileNav from "@/components/mobile-nav";
import LoadingState from "@/components/loading-state";

type Transaction = { id: string; kind: string; amount: number; category: string; date: string; note: string };
type User = { username: string; cycleStartDay: number; onboardingComplete: boolean };

function money(amount: number) {
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });
}

function dateFromString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftPeriodStart(value: string, months: number) {
  const date = dateFromString(value);
  date.setMonth(date.getMonth() + months);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AnalysisPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriodStart, setSelectedPeriodStart] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("Could not load your analysis.");
      const data = await response.json();
      if (!data.user.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setUser(data.user);
      setTransactions(data.transactions);
      setSelectedPeriodStart(getFinancialPeriod(data.user.cycleStartDay).startDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const period = useMemo(
    () => (user && selectedPeriodStart
      ? getFinancialPeriod(user.cycleStartDay, dateFromString(selectedPeriodStart))
      : null),
    [user, selectedPeriodStart],
  );
  const dailySpend = useMemo(() => {
    const totals = new Map<string, number>();
    transactions
      .filter((t) => t.kind === "Expense" && period && t.date >= period.startDate && t.date <= period.endDate)
      .forEach((t) => totals.set(t.date, (totals.get(t.date) ?? 0) + t.amount));
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [transactions, period]);
  const maxSpend = Math.max(...dailySpend.map(([, amount]) => amount), 1);
  const totalSpend = dailySpend.reduce((sum, [, amount]) => sum + amount, 0);
  const average = dailySpend.length ? totalSpend / dailySpend.length : 0;
  const periodOptions = useMemo(
    () => (user
      ? Array.from({ length: 12 }, (_, index) => {
        const currentStartDate = getFinancialPeriod(user.cycleStartDay).startDate;
        const startDate = shiftPeriodStart(currentStartDate, -index);
        return getFinancialPeriod(user.cycleStartDay, dateFromString(startDate));
      })
      : []),
    [user],
  );
  const monthlySpend = useMemo(
    () => (user && selectedPeriodStart
      ? Array.from({ length: 6 }, (_, index) => {
        const startDate = shiftPeriodStart(selectedPeriodStart, -(5 - index));
        const monthlyPeriod = getFinancialPeriod(user.cycleStartDay, dateFromString(startDate));
        const amount = transactions
          .filter((transaction) => transaction.kind === "Expense" && transaction.date >= monthlyPeriod.startDate && transaction.date <= monthlyPeriod.endDate)
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        return { ...monthlyPeriod, amount, shortLabel: dateFromString(monthlyPeriod.startDate).toLocaleDateString("en-IN", { month: "short" }) };
      })
      : []),
    [selectedPeriodStart, transactions, user],
  );
  const maxMonthlySpend = Math.max(...monthlySpend.map((item) => item.amount), 1);
  const highestSpendPeriod = monthlySpend.reduce((highest, item) => item.amount > highest.amount ? item : highest, monthlySpend[0]);
  const previousSpend = monthlySpend.length > 1 ? monthlySpend[monthlySpend.length - 2].amount : 0;
  const spendChange = previousSpend > 0 ? ((totalSpend - previousSpend) / previousSpend) * 100 : null;

  if (loading) return <main className="min-h-screen bg-slate-50"><MobileNav /><LoadingState label="Preparing your spending analysis..." /></main>;

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 sm:pb-8">
      <MobileNav />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-8 sm:px-5 sm:py-8">
        <div>
          <p className="text-sm font-semibold text-emerald-700">SPENDING INSIGHTS</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Spending analysis</h1>
              <p className="mt-1 text-sm text-slate-500">{period?.label}</p>
            </div>
            <label className="text-xs font-semibold text-slate-600">
              Select financial month
              <select
                value={selectedPeriodStart}
                onChange={(event) => setSelectedPeriodStart(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              >
                {periodOptions.map((option) => <option key={option.startDate} value={option.startDate}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["Total spent", money(totalSpend)],
            ["Average spending day", money(average)],
            ["Spending days", String(dailySpend.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold">{value}</p>
            </div>
          ))}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold">Daily spending</h2><p className="mt-1 text-xs text-slate-500">Expenses grouped by date</p></div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{money(totalSpend)}</span>
          </div>
          {dailySpend.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-center text-sm text-slate-500">No expenses recorded in this financial month.</div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[560px]">
                <svg
                  viewBox="0 0 800 300"
                  className="h-64 w-full overflow-visible"
                  role="img"
                  aria-label="Daily spending line chart"
                >
                  {[0, 1, 2, 3, 4].map((line) => {
                    const y = 24 + line * 58;
                    return <line key={line} x1="48" x2="780" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
                  })}
                  <polyline
                    fill="none"
                    stroke="#e11d48"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                    points={dailySpend
                      .map(([, amount], index) => {
                        const x = dailySpend.length === 1 ? 400 : 56 + (index / (dailySpend.length - 1)) * 712;
                        const y = 256 - (amount / maxSpend) * 220;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {dailySpend.map(([date, amount], index) => {
                    const x = dailySpend.length === 1 ? 400 : 56 + (index / (dailySpend.length - 1)) * 712;
                    const y = 256 - (amount / maxSpend) * 220;
                    return (
                      <g key={date}>
                        <circle cx={x} cy={y} r="6" fill="#fff" stroke="#e11d48" strokeWidth="3" />
                        <title>{`${date}: ${money(amount)}`}</title>
                        <text x={x} y="282" textAnchor="middle" className="fill-slate-500 text-[11px]">{date.slice(8)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">MONTH-BY-MONTH ANALYSIS</p>
              <h2 className="mt-1 font-bold">Spending trend</h2>
              <p className="mt-1 text-xs text-slate-500">Expense totals across your last six financial months</p>
            </div>
            {highestSpendPeriod?.amount > 0 && <span className="text-xs font-semibold text-slate-500">Highest: {highestSpendPeriod.label} · {money(highestSpendPeriod.amount)}</span>}
          </div>
          <div className="mt-6 flex h-64 items-end gap-2 border-b border-l px-2 pb-2 sm:gap-5">
            {monthlySpend.map((item) => (
              <button
                key={item.startDate}
                type="button"
                onClick={() => setSelectedPeriodStart(item.startDate)}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                title={`${item.label}: ${money(item.amount)}`}
              >
                <span className="text-[11px] font-semibold text-slate-600">{item.amount ? money(item.amount) : "—"}</span>
                <span className={`w-full max-w-14 rounded-t-lg transition ${item.startDate === selectedPeriodStart ? "bg-emerald-700" : "bg-emerald-300"}`} style={{ height: `${Math.max((item.amount / maxMonthlySpend) * 78, item.amount ? 8 : 2)}%` }} />
                <span className={`text-xs font-semibold ${item.startDate === selectedPeriodStart ? "text-emerald-700" : "text-slate-500"}`}>{item.shortLabel}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
              <span className="mr-2 text-emerald-600">✦</span>
              {totalSpend ? `${period?.label} spending is ${money(totalSpend)} across ${dailySpend.length} spending day${dailySpend.length === 1 ? "" : "s"}.` : `No expenses recorded for ${period?.label || "this financial month"}.`}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <span className="mr-2 text-emerald-600">✦</span>
              {spendChange === null ? "Add another month of expenses to see your spending change." : `${spendChange >= 0 ? "Up" : "Down"} ${Math.abs(spendChange).toFixed(0)}% compared with the previous financial month.`}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
