import { BadgeAlert, BadgeCheck, Sparkles } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    redirect?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_hub_token: "Não foi possível validar seu acesso pela área de membros. Faça login novamente.",
  missing_hub_token: "Token de acesso ausente. Tente iniciar o acesso novamente pela área de membros.",
  invalid_hub_product: "Este link não corresponde ao produto Car Studio.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const errorCode = params.error ?? "";
  const redirectPath = params.redirect?.startsWith("/") ? params.redirect : "/studio";
  const hubStartHref = `/api/auth/hub/start?redirect_to=${encodeURIComponent(redirectPath)}`;
  const errorMessage = ERROR_MESSAGES[errorCode];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/5">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Car Studio AI</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:flex-row lg:items-start lg:gap-12">
        <section className="flex-1 rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
            <BadgeCheck className="h-3.5 w-3.5" />
            Login seguro
          </div>

          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Entre para continuar suas gerações no Car Studio.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Acesse com Google ou e-mail para visualizar seus créditos e continuar editando suas fotos automotivas.
          </p>

          {errorMessage ? (
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              <BadgeAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          ) : null}
        </section>

        <section className="w-full rounded-3xl border border-white/10 bg-zinc-900/80 p-7 sm:p-10 lg:max-w-sm">
          <h2 className="mb-6 text-lg font-semibold">Acesse sua conta</h2>
          <a
            href={hubStartHref}
            className="mb-4 inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Continuar pela área de membros
          </a>
          <AuthForm redirectTo={redirectPath} />
        </section>
      </main>
    </div>
  );
}
