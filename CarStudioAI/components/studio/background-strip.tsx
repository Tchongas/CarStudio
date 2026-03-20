import type { ChangeEventHandler } from "react";
import { CheckCircle2, ImageUp, X } from "lucide-react";
import { BACKGROUND_VARIANTS, type BackgroundId } from "@/lib/ai/backgrounds";

type BackgroundStripProps = {
  background: BackgroundId;
  customBackgroundPreviewUrl: string | null;
  onSelectBackground: (id: BackgroundId) => void;
  onCustomBackgroundChange: ChangeEventHandler<HTMLInputElement>;
  onRemoveCustomBackground: () => void;
};

export function BackgroundStrip({ background, customBackgroundPreviewUrl, onSelectBackground, onCustomBackgroundChange, onRemoveCustomBackground }: BackgroundStripProps) {
  const variants = Object.keys(BACKGROUND_VARIANTS) as BackgroundId[];

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">02 Fundo</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Escolha o cenário do lote</h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-gray-500">O fundo selecionado será usado nas próximas imagens geradas.</p>
      </div>
 
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Cenários disponíveis</p>
        <span className="text-[11px] text-gray-400">Deslize para ver mais</span>
      </div>

      <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 pr-1" role="listbox" aria-label="Selecionar cenário de fundo">
        <label
          className={`relative min-h-[128px] min-w-[220px] snap-start cursor-pointer overflow-hidden rounded-2xl border text-left transition focus-within:outline-none focus-within:ring-2 focus-within:ring-black/20 sm:min-h-[136px] sm:min-w-[216px] ${customBackgroundPreviewUrl ? "border-black shadow-md" : "border-gray-200 hover:border-gray-300 active:border-gray-400"}`}
        >
          <input type="file" className="hidden" accept="image/*" onChange={onCustomBackgroundChange} />
          {customBackgroundPreviewUrl ? <img src={customBackgroundPreviewUrl} alt="Fundo personalizado" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className={`absolute inset-0 ${customBackgroundPreviewUrl ? "bg-black/30" : "bg-gradient-to-br from-gray-900 to-gray-700"}`} />

          {customBackgroundPreviewUrl ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemoveCustomBackground();
              }}
              className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
              aria-label="Remover fundo personalizado"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          <div className="relative flex h-full min-h-[128px] items-end p-3 sm:min-h-[136px]">
            <div className="flex w-full items-end justify-between gap-2">
              <div>
                <span className="block text-sm font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">Fundo personalizado</span>
                <span className="mt-1 block text-[11px] text-white/80">Clique para enviar arquivo</span>
              </div>
              {customBackgroundPreviewUrl ? <CheckCircle2 className="h-4 w-4 shrink-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" /> : <ImageUp className="h-4 w-4 shrink-0 text-white/90" />}
            </div>
          </div>
        </label>

        {variants.map((id) => {
          const variant = BACKGROUND_VARIANTS[id];
          const active = !customBackgroundPreviewUrl && id === background;
          const imageUrl = variant.images[0];
 
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectBackground(id)}
              className={`relative min-h-[128px] min-w-[220px] snap-start overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:min-h-[136px] sm:min-w-[216px] ${active ? "border-black shadow-md" : "border-gray-200 hover:border-gray-300 active:border-gray-400"}`}
              aria-pressed={active}
              role="option"
              style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className={`absolute inset-0 ${active ? "bg-black/30" : "bg-black/40"}`} />
              <div className="relative flex h-full min-h-[128px] items-end p-3 sm:min-h-[136px]">
                <div className="flex w-full items-end justify-between gap-2">
                  <span className="text-sm font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">{variant.label}</span>
                  {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" /> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
