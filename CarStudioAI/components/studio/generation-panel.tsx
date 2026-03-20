import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronRight, Layers3, Loader2, Minus, Plus, X } from "lucide-react";
import type { QueueItemView } from "@/components/studio/types";

type GenerationPanelProps = {
  credits: number;
  isLoadingCredits: boolean;
  isProcessing: boolean;
  pendingCount: number;
  items: QueueItemView[];
  selectedItemId: string | null;
  selectedImageUrl: string | null;
  selectedBackgroundLabel: string;
  hasSelection: boolean;
  canGenerateSelected: boolean;
  canGenerateAll: boolean;
  onSelectItem: (id: string) => void;
  onGenerateSelected: () => void;
  onGenerateAll: () => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export function GenerationPanel({
  credits,
  isLoadingCredits,
  isProcessing,
  pendingCount,
  items,
  selectedItemId,
  selectedImageUrl,
  selectedBackgroundLabel,
  hasSelection,
  canGenerateSelected,
  canGenerateAll,
  onSelectItem,
  onGenerateSelected,
  onGenerateAll,
}: GenerationPanelProps) {
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<DragState | null>(null);
  const isProfessionalMode = items.length > 1;

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [selectedImageUrl]);

  const handleOpenBatchConfirm = () => {
    if (!canGenerateAll) {
      return;
    }

    setIsBatchConfirmOpen(true);
  };

  const handleConfirmBatch = () => {
    setIsBatchConfirmOpen(false);
    onGenerateAll();
  };

  const handleZoomIn = () => {
    setZoom((current) => Math.min(2.5, Number((current + 0.12).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((current) => Math.max(0.8, Number((current - 0.12).toFixed(2))));
  };

  const handlePreviewPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectedImageUrl) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePreviewPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    setOffset({
      x: dragStateRef.current.originX + deltaX,
      y: dragStateRef.current.originY + deltaY,
    });
  };

  const handlePreviewPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!isProfessionalMode) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">03 Geração</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Gerar</h2>
            </div>
            <div className="rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {isLoadingCredits ? "..." : `${credits} crédito(s)`}
            </div>
          </div>

          {isProcessing ? (
            <div className="rounded-3xl border border-black bg-black p-5 text-white" aria-live="polite">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processando
              </div>
              <p className="mt-3 text-lg font-semibold">Sua imagem está sendo gerada.</p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Aguarde enquanto aplicamos o fundo <span className="font-semibold text-white">{selectedBackgroundLabel}</span>.
              </p>
            </div>
          ) : (
            <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-4 sm:p-6">
              <div className="inline-flex max-w-full items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
                <span className="truncate">Fundo atual: <span className="font-semibold text-gray-900">{selectedBackgroundLabel}</span></span>
              </div>

              <div className="mt-6 max-w-md">
                <button
                  type="button"
                  onClick={onGenerateSelected}
                  disabled={!canGenerateSelected}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <ChevronRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">Gerar imagem</span>
                  <span className="shrink-0 rounded-full bg-black px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">1 Crédito</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">03 Geração</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{isProfessionalMode ? "Revisar" : "Gerar"}</h2>
            </div>
            <div className="rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {isLoadingCredits ? "..." : `${credits} crédito(s)`}
            </div>
          </div>

          {isProcessing ? (
            <div className="rounded-3xl border border-black bg-black p-5 text-white" aria-live="polite">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processando
              </div>
              <p className="mt-3 text-lg font-semibold">A confirmação foi aceita e a geração está em andamento.</p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Aguarde enquanto aplicamos o fundo <span className="font-semibold text-white">{selectedBackgroundLabel}</span> às imagens escolhidas.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-gray-50">
              <div className={`grid gap-0 ${isProfessionalMode ? "xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"}`}>
                <div className={`bg-white ${isProfessionalMode ? "border-b border-gray-200 xl:border-b-0 xl:border-r" : "border-b border-gray-200 lg:border-b-0 lg:border-r"}`}>
                  <div className="p-3 sm:p-4">
                    <div
                      className={`relative mx-auto aspect-square w-full overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] ${isProfessionalMode ? "max-w-[250px] sm:max-w-[280px]" : "max-w-[280px] sm:max-w-[360px]"} ${selectedImageUrl ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
                      onPointerDown={handlePreviewPointerDown}
                      onPointerMove={handlePreviewPointerMove}
                      onPointerUp={handlePreviewPointerUp}
                      onPointerCancel={handlePreviewPointerUp}
                    >
                      {selectedImageUrl ? (
                        <img
                          src={selectedImageUrl}
                          alt="Pré-visualização da imagem selecionada"
                          className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
                          draggable={false}
                          style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white px-4 text-center text-sm text-gray-400 sm:px-6">
                          Selecione uma imagem para revisar antes de gerar
                        </div>
                      )}
                    </div>

                    <div className={`mx-auto mt-3 flex items-center justify-between gap-3 ${isProfessionalMode ? "max-w-[280px]" : "max-w-[360px]"}`}>
                      <p className="text-[11px] leading-relaxed text-gray-500">
                        Arraste para reposicionar a imagem.
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          disabled={!selectedImageUrl}
                          aria-label="Diminuir zoom da prévia"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleZoomIn}
                          disabled={!selectedImageUrl}
                          aria-label="Aumentar zoom da prévia"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className={`mx-auto mt-2 text-xs text-gray-500 ${isProfessionalMode ? "max-w-[280px]" : "max-w-[360px]"}`}>Zoom: {Math.round(zoom * 100)}%</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                  <div className="inline-flex max-w-full items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
                    <span className="truncate">Fundo: <span className="font-semibold text-gray-900">{selectedBackgroundLabel}</span></span>
                  </div>

                  {isProfessionalMode ? (
                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Selecionar imagem para revisão</p>
                      </div>

                      <div className="mt-3 grid max-h-[196px] grid-flow-col grid-rows-2 gap-2 overflow-x-auto pb-2 pr-1 auto-cols-[88px] sm:max-h-[228px] sm:gap-3 sm:auto-cols-[124px]" role="listbox" aria-label="Selecionar imagem para revisão">
                        {items.length > 0 ? (
                          items.map((item) => {
                            const isActive = item.id === selectedItemId;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectItem(item.id)}
                                aria-pressed={isActive}
                                role="option"
                                className={`min-h-[108px] overflow-hidden rounded-2xl border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:min-h-[108px] ${isActive ? "border-black ring-2 ring-black/10" : "border-gray-200 hover:border-gray-300 active:border-gray-400"}`}
                              >
                                <div className="aspect-[4/3] bg-gray-100">
                                  <img src={item.resultUrl ?? item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                                </div>
                                <div className="p-2.5 sm:p-3">
                                  <p className="line-clamp-2 text-[11px] leading-snug font-medium text-gray-700">{item.name}</p>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-400">
                            Nenhuma imagem adicionada.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className={`mt-6 grid gap-3 ${isProfessionalMode ? "md:grid-cols-2" : "sm:max-w-[360px]"}`}>
                    <button
                      type="button"
                      onClick={onGenerateSelected}
                      disabled={!canGenerateSelected}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0" />
                      <span className="truncate">Gerar imagem atual</span>
                      <span className="shrink-0 rounded-full bg-black px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">1 Crédito</span>
                    </button>

                    {isProfessionalMode ? (
                      <button
                        type="button"
                        onClick={handleOpenBatchConfirm}
                        disabled={!canGenerateAll}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                      >
                        <Layers3 className="h-4 w-4 shrink-0" />
                        <span className="truncate">Gerar lote</span>
                        <span className="shrink-0 rounded-full bg-black px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">{pendingCount} Créditos</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {isBatchConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 pb-3 pt-10 sm:items-center sm:px-4 sm:pb-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Confirmar lote</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">Iniciar geração em lote?</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsBatchConfirmOpen(false)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                aria-label="Fechar confirmação de lote"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Se você usar <span className="font-semibold text-gray-900">Gerar lote</span>, todas as imagens adicionadas receberão este mesmo fundo:
              <span className="font-semibold text-gray-900"> {selectedBackgroundLabel}</span>.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Esta ação irá consumir <span className="font-semibold">{pendingCount} crédito(s)</span> se todas as pendentes forem processadas.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsBatchConfirmOpen(false)}
                className="min-h-12 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBatch}
                className="min-h-12 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Iniciar geração
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
