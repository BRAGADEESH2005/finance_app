"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      router.push("/onboarding");
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
        className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            MY FINANCE
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Start tracking your money in one place.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. braga_123"
            className="w-full rounded-lg border px-3 py-3"
          />
          <p className="text-xs text-slate-500">
            3–30 letters, numbers or underscores.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            className="w-full rounded-lg border px-3 py-3"
          />
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
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-emerald-700" href="/login">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}