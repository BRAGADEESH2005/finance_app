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

export default function AnalysisPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    () => (user ? getFinancialPeriod(user.cycleStartDay) : null),
    [user],
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

  if (loading) return <main className="min-h-screen bg-slate-50"><MobileNav /><LoadingState label="Preparing your spending analysis..." /></main>;

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 sm:pb-8">
      <MobileNav />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-8 sm:px-5 sm:py-8">
        <div>
          <p className="text-sm font-semibold text-emerald-700">SPENDING INSIGHTS</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Daily spend analysis</h1>
          <p className="mt-1 text-sm text-slate-500">{period?.label}</p>
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
      </div>
    </main>
  );
}
