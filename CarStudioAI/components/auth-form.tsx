"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthFormProps = {
  redirectTo?: string;
};

export function AuthForm({ redirectTo = "/studio" }: AuthFormProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
    : `/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setMessage(null);

    const target = `/api/auth/google?redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.assign(target);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setMessage({ type: "error", text: "Serviço de autenticação indisponível." });
      return;
    }

    if (!email.trim()) {
      setMessage({ type: "error", text: "Informe seu e-mail." });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl },
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Verifique seu e-mail para confirmar o cadastro." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        window.location.href = redirectTo;
      }
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm space-y-5">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Entrar com Google
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-zinc-500">ou</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-3">
        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="auth-password" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Senha
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "signup" ? "Criar conta" : "Entrar com e-mail"}
        </button>
      </form>

      <p className="text-center text-xs text-zinc-500">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <button type="button" onClick={() => { setMode("signup"); setMessage(null); }} className="text-white underline underline-offset-2 hover:text-zinc-300">
              Criar conta
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button type="button" onClick={() => { setMode("login"); setMessage(null); }} className="text-white underline underline-offset-2 hover:text-zinc-300">
              Fazer login
            </button>
          </>
        )}
      </p>

      {message ? (
        <div className={`rounded-xl border px-4 py-3 text-xs ${message.type === "error" ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
