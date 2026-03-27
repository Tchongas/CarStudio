"use client";

import { ChevronDown, Coins, Image as ImageIcon, LogOut, UserCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BuyCreditsModal } from "@/components/studio/buy-credits-modal";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type StudioHeaderProps = {
  credits: number;
  isLoadingCredits: boolean;
  userEmail?: string | null;
};

export function StudioHeader({ credits, isLoadingCredits, userEmail }: StudioHeaderProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) {
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });

    if (supabase) {
      await supabase.auth.signOut();
    }

    window.location.href = "/";
  };

  const creditColor =
    isLoadingCredits ? "bg-gray-200 text-gray-500" :
    credits <= 0 ? "bg-red-100 text-red-700 border border-red-200" :
    credits <= 3 ? "bg-amber-100 text-amber-800 border border-amber-200" :
    "bg-emerald-100 text-emerald-800 border border-emerald-200";

  return (
    <>
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center shadow-sm">
            <ImageIcon className="text-white w-[18px] h-[18px]" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
              Car Studio <span className="text-gray-400 font-medium text-sm">AI</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide leading-none hidden sm:block">Fotografia automotiva profissional</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {userEmail ? (
            <div className="hidden rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 lg:flex items-center gap-1.5 max-w-[200px]">
              <span className="truncate">{userEmail}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsBuyCreditsOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-full bg-black px-4 text-xs font-semibold text-white transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Comprar créditos
          </button>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${creditColor} transition-colors`}>
            <Coins className="h-3.5 w-3.5" />
            {isLoadingCredits ? (
              <span className="inline-block w-4 h-3 rounded bg-current opacity-20 animate-pulse" />
            ) : (
              <span>{credits} crédito{credits !== 1 ? "s" : ""}</span>
            )}
          </div>

          {userEmail ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 px-2.5 text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                aria-label="Abrir perfil"
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
              >
                <UserCircle2 className="h-4 w-4" />
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              {isProfileOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Perfil</p>
                  <p className="mt-1 truncate text-sm font-medium text-gray-700">{userEmail}</p>

                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Créditos disponíveis</p>
                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {isLoadingCredits ? "Carregando..." : `${credits} crédito${credits !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <BuyCreditsModal isOpen={isBuyCreditsOpen} onClose={() => setIsBuyCreditsOpen(false)} />
    </>
  );
}
