"use client";

import { type MouseEvent } from "react";
import { X } from "lucide-react";
import { CREDIT_PURCHASE_OPTIONS } from "@/lib/credits/purchase-links";

type BuyCreditsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-[2px] animate-[fadeIn_180ms_ease-out]"
      onClick={handleBackdropClick}
    >
      <div className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)] sm:p-7 animate-[slideDown_220ms_ease-out]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Comprar créditos</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Escolha seu pacote</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Selecione a quantidade de créditos ideal para continuar gerando imagens profissionais no Car Studio AI.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
              aria-label="Fechar modal de compra de créditos"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            {CREDIT_PURCHASE_OPTIONS.map((option) => (
              <a
                key={option.credits}
                href={option.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 transition hover:border-black hover:bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{option.credits} créditos</p>
                  <p className="mt-1 text-xs text-gray-500">Abrir pagamento no Hotmart</p>
                </div>
                <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Comprar</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
