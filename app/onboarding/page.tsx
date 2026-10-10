"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function ordinal(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [startDay, setStartDay] = useState(26);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return null;
        }
        return res.json();
      })
      .then((user) => {
        if (!user) return;

        setUsername(user.username);
        setStartDay(user.cycleStartDay);

        const editing =
          new URLSearchParams(window.location.search).get("edit") === "1";

        if (user.onboardingComplete && !editing) {
          router.replace("/");
        }
      })
      .catch(() => setError("Could not load your account."));
  }, [router]);

  const endDay = startDay === 1 ? null : startDay - 1;

  const preview =
    startDay === 1
      ? "Your financial month will follow the calendar month, from the 1st to its last day."
      : `Your financial month will run from the ${ordinal(startDay)} through the ${ordinal(endDay!)} of the following month.`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDay }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not save your settings.");
        return;
      }

      router.push("/");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-6 rounded-2xl border bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            ACCOUNT SETUP
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Welcome{username ? `, ${username}` : ""}!
          </h1>
          <p className="mt-2 text-slate-600">
            Let's set up your financial month.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="startDay" className="font-medium">
            Which day should your financial month start?
          </label>
          <select
            id="startDay"
            value={startDay}
            onChange={(e) => setStartDay(Number(e.target.value))}
            className="w-full rounded-lg border bg-white px-3 py-3"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {ordinal(day)}
                {day === 1 ? " — calendar month" : ""}
                {day === 26 ? " — recommended for salary on the 25th" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            Your financial-month preview
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">{preview}</p>
          <p className="mt-2 text-xs text-emerald-800">
            Your income, expenses and investments will be grouped using this
            cycle.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save and open dashboard"}
        </button>
      </form>
    </main>
  );
}
