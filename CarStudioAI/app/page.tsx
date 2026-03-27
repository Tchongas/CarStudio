import { BadgeCheck, Sparkles } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { CREDIT_PURCHASE_OPTIONS } from "@/lib/credits/purchase-links";

export default function HomePage() {
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
            Fotos automotivas profissionais
          </div>

          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Transforme fotos comuns de carros em imagens com visual de estúdio.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            O Car Studio AI melhora iluminação, remove distrações e aplica cenários elegantes para seus anúncios parecerem mais premium.
            Mais cliques, mais confiança e mais chances de venda.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-zinc-400">
            <li className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> 2 créditos grátis para testar</li>
            <li className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Resultados em segundos com IA</li>
            <li className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> 5 cenários profissionais inclusos</li>
          </ul>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Comprar créditos</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Pacotes prontos para continuar gerando</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
              Escolha o pacote ideal para seu volume de anúncios e finalize a compra no Hotmart.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {CREDIT_PURCHASE_OPTIONS.map((option) => (
                <a
                  key={option.credits}
                  href={option.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 transition hover:border-white/30 hover:bg-zinc-900"
                >
                  <p className="text-lg font-semibold text-white">{option.credits} créditos</p>
                  <p className="mt-1 text-xs text-zinc-400">Pagamento seguro via Hotmart</p>
                  <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
                    {option.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-white/10 bg-zinc-900/80 p-7 sm:p-10 lg:max-w-sm">
          <h2 className="mb-6 text-lg font-semibold">Acesse sua conta</h2>
          <AuthForm />
        </section>
      </main>
    </div>
  );
}
