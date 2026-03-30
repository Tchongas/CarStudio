"use client";

import { useState } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";

type LookupResponse = {
  email?: string;
  creditsBalance?: number;
  previousBalance?: number;
  adjustmentAmount?: number;
  error?: string;
};

type CreditsAdminDashboardProps = {
  adminEmail: string;
};

export function CreditsAdminDashboard({ adminEmail }: CreditsAdminDashboardProps) {
  const [email, setEmail] = useState("");
  const [balanceInput, setBalanceInput] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLookup = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFeedback({ type: "error", text: "Informe o e-mail do usuário que deseja consultar." });
      return;
    }

    setIsLookingUp(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/credits?email=${encodeURIComponent(normalizedEmail)}`);
      const payload = (await response.json()) as LookupResponse;

      if (!response.ok || payload.error) {
        setResolvedEmail(null);
        setCurrentBalance(null);
        setBalanceInput("");
        setFeedback({ type: "error", text: payload.error ?? "Não foi possível consultar o saldo." });
        return;
      }

      setResolvedEmail(payload.email ?? normalizedEmail);
      setCurrentBalance(payload.creditsBalance ?? 0);
      setBalanceInput(String(payload.creditsBalance ?? 0));
      setFeedback(null);
    } catch {
      setFeedback({ type: "error", text: "Não foi possível consultar o saldo." });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = async () => {
    if (!resolvedEmail) {
      setFeedback({ type: "error", text: "Busque um usuário antes de atualizar o saldo." });
      return;
    }

    const parsedBalance = Number(balanceInput);
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      setFeedback({ type: "error", text: "Informe um saldo válido maior ou igual a zero." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resolvedEmail,
          targetBalance: parsedBalance,
        }),
      });
      const payload = (await response.json()) as LookupResponse;

      if (!response.ok || payload.error) {
        setFeedback({ type: "error", text: payload.error ?? "Não foi possível atualizar o saldo." });
        return;
      }

      setResolvedEmail(payload.email ?? resolvedEmail);
      setCurrentBalance(payload.creditsBalance ?? parsedBalance);
      setBalanceInput(String(payload.creditsBalance ?? parsedBalance));
      setFeedback({
        type: "success",
        text: `Saldo atualizado de ${payload.previousBalance ?? 0} para ${payload.creditsBalance ?? parsedBalance} crédito(s).`,
      });
    } catch {
      setFeedback({ type: "error", text: "Não foi possível atualizar o saldo." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">Dashboard de créditos</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Consulte o saldo de um usuário e ajuste o novo saldo com registro no ledger administrativo.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Administrador logado</p>
              <p className="mt-1 font-medium text-gray-800">{adminEmail}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <label htmlFor="admin-user-email" className="text-sm font-semibold text-gray-700">
                E-mail do usuário
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="admin-user-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={isLookingUp}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Buscar saldo
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Saldo atual</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-gray-900">
                {currentBalance ?? "--"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {resolvedEmail ?? "Busque um usuário para visualizar e editar o saldo."}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label htmlFor="admin-target-balance" className="text-sm font-semibold text-gray-700">
              Novo saldo
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="admin-target-balance"
                type="number"
                min="0"
                step="1"
                value={balanceInput}
                onChange={(event) => setBalanceInput(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10 sm:max-w-xs"
                placeholder="0"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !resolvedEmail}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-900 bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar novo saldo
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              O ajuste cria entradas no ledger administrativo para manter o histórico auditável de créditos.
            </p>
          </div>

          {feedback ? (
            <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${feedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {feedback.text}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
