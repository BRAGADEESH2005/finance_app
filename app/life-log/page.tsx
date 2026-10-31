"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/mobile-nav";
import LoadingState from "@/components/loading-state";

type Entry = {
  id: string;
  date: string;
  event: string;
  amount: number | null;
  note: string;
};

function localDateString() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function money(amount: number) {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export default function LifeLogPage() {
  const router = useRouter();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState("");
  const [event, setEvent] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setDate(localDateString());
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/life-log");

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load entries.");
      }

      setEntries(data.entries);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function addEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!event.trim() || !date) {
      setError("Please enter an event and date.");
      return;
    }

    const numericAmount =
      amount.trim() === "" ? null : Number(amount);

    if (
      numericAmount !== null &&
      (!Number.isFinite(numericAmount) || numericAmount < 0)
    ) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/life-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          event: event.trim(),
          amount: numericAmount,
          note: note.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save entry.");
      }

      setEntries((previous) =>
        [data, ...previous].sort(
          (a, b) =>
            b.date.localeCompare(a.date)
        )
      );

      setEvent("");
      setAmount("");
      setNote("");

      setSuccess("Event added to your Life Log.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save entry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/life-log/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete entry.");
      }

      setEntries((previous) =>
        previous.filter((entry) => entry.id !== id)
      );

      setSuccess("Entry deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete entry."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <MobileNav />
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 sm:pb-8">
      <MobileNav />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-5 sm:py-8">

        {/* Header */}
        <section className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-emerald-300">
            YOUR PERSONAL SPACE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Life Log
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            A place to record important events, milestones and
            moments worth remembering. Keep track of what matters
            to you, all in one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">
                Total events recorded
              </p>
              <p className="mt-1 text-2xl font-bold">
                {entries.length}
              </p>
            </div>
          </div>
        </section>

        {/* Notifications */}
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

        {/* Add Entry + History */}
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">

          {/* Add Event Form */}
          <form
            onSubmit={addEntry}
            className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-bold">
                Record an event
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add something important to remember.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="date"
                className="text-sm font-medium"
              >
                Date
              </label>

              <input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="event"
                className="text-sm font-medium"
              >
                Event
              </label>

              <input
                id="event"
                type="text"
                required
                maxLength={150}
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="e.g. Received salary increment"
                className="w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="amount"
                className="text-sm font-medium"
              >
                Amount (₹)
                <span className="ml-2 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Leave empty if not applicable"
                className="w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="note"
                className="text-sm font-medium"
              >
                Notes
                <span className="ml-2 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                id="note"
                maxLength={500}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any additional details..."
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !date || !event.trim()}
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add to Life Log"}
            </button>
          </form>

          {/* Event History */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Your timeline
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All your recorded events, across every date.
              </p>
            </div>

            {entries.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-10 text-center">
                <div className="text-4xl">✦</div>

                <p className="mt-3 font-semibold">
                  Your timeline starts here
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Record your first important event using
                  the form.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="relative flex gap-4 border-b border-slate-100 py-5 last:border-0"
                  >
                    {/* Timeline marker */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        ✦
                      </div>

                      {index !== entries.length - 1 && (
                        <div className="mt-2 w-px flex-1 bg-slate-200" />
                      )}
                    </div>

                    {/* Event details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-slate-900">
                            {entry.event}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(entry.date)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void deleteEntry(entry.id)}
                          aria-label={`Delete ${entry.event}`}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Delete
                        </button>
                      </div>

                      {entry.amount !== null && (
                        <p className="mt-2 font-semibold text-emerald-700">
                          {money(entry.amount)}
                        </p>
                      )}

                      {entry.note && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <p className="pb-6 text-center text-xs text-slate-400">
          Your Life Log is personal and separate from your financial tracking.
        </p>
      </div>
    </main>
  );
}