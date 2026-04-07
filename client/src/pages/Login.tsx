import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("E-post och lösenord är obligatoriskt.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body: Record<string, string> = { email: normalizedEmail, password };
      if (mode === "register" && name.trim()) {
        body.name = name.trim();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Något gick fel.");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          {mode === "login" ? "Logga in" : "Skapa konto"}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          {mode === "login"
            ? "Logga in i Heidenhain Lead Intelligence System."
            : "Skapa ett nytt konto för Heidenhain LIS."}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="block text-sm font-medium text-slate-700">
              Namn
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ditt namn"
              />
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            E-post
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Lösenord
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Minst 6 tecken" : "Ditt lösenord"}
              required
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? (mode === "login" ? "Loggar in..." : "Skapar konto...")
              : (mode === "login" ? "Logga in" : "Skapa konto")}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <>
              Har du inget konto?{" "}
              <button
                type="button"
                className="text-slate-900 font-medium hover:underline"
                onClick={() => { setMode("register"); setError(null); }}
              >
                Skapa konto
              </button>
            </>
          ) : (
            <>
              Har du redan ett konto?{" "}
              <button
                type="button"
                className="text-slate-900 font-medium hover:underline"
                onClick={() => { setMode("login"); setError(null); }}
              >
                Logga in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
