import { useState, type ChangeEventHandler, type DragEventHandler } from "react";
import { CheckCircle2, FolderPlus, ImagePlus, ImageUp, RefreshCw, Trash2, Upload, X } from "lucide-react";
import type { QueueItemView } from "@/components/studio/types";
import { BACKGROUND_VARIANTS, type BackgroundId } from "@/lib/ai/backgrounds";

type UploadGalleryPanelProps = {
  items: QueueItemView[];
  background: BackgroundId;
  customBackgroundPreviewUrl: string | null;
  onSelectBackground: (id: BackgroundId) => void;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onDrop: DragEventHandler<HTMLLabelElement>;
  onCustomBackgroundChange: ChangeEventHandler<HTMLInputElement>;
  onRemoveCustomBackground: () => void;
  onRemove: (id: string) => void;
  onReset: () => void;
  onRemoveCompleted: () => void;
};

const STATUS_CONFIG: Record<QueueItemView["status"], { label: string; color: string; dot: string }> = {
  idle: { label: "Na fila", color: "text-gray-500", dot: "bg-gray-400" },
  processing: { label: "Processando", color: "text-blue-600", dot: "bg-blue-500 animate-[pulseRing_1.5s_ease-in-out_infinite]" },
  done: { label: "Pronta", color: "text-emerald-600", dot: "bg-emerald-500" },
  error: { label: "Erro", color: "text-red-600", dot: "bg-red-500" },
};

export function UploadGalleryPanel({
  items,
  background,
  customBackgroundPreviewUrl,
  onSelectBackground,
  onFileChange,
  onDrop,
  onCustomBackgroundChange,
  onRemoveCustomBackground,
  onRemove,
  onReset,
  onRemoveCompleted,
}: UploadGalleryPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const hasItems = items.length > 0;
  const completedCount = items.filter((item) => item.status === "done").length;
  const isProfessionalMode = items.length > 1;
  const singleItem = items[0] ?? null;
  const variants = Object.keys(BACKGROUND_VARIANTS) as BackgroundId[];
  const activeBackgroundLabel = customBackgroundPreviewUrl ? "Fundo personalizado" : BACKGROUND_VARIANTS[background].label;

  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop: DragEventHandler<HTMLLabelElement> = (event) => {
    setIsDragging(false);
    onDrop(event);
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">01 Upload</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Envie Suas Imagens</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">Adicione as fotos que deseja processar.</p>
        </div>

        {hasItems ? (
          <div className="flex flex-wrap gap-2">
            {isProfessionalMode ? (
              <button
                type="button"
                onClick={onRemoveCompleted}
                disabled={completedCount < 1}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar prontas
              </button>
            ) : null}

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isProfessionalMode ? "Limpar tudo" : "Trocar imagem"}
            </button>
          </div>
        ) : null}
      </div>

      {isProfessionalMode ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <label
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group block cursor-pointer rounded-3xl border-2 border-dashed p-6 transition ${isDragging ? "border-black bg-gray-100 scale-[1.01]" : "border-gray-200 bg-gray-50/70 hover:border-black hover:bg-gray-50"}`}
          >
            <input type="file" className="hidden" onChange={onFileChange} accept="image/*" multiple />
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
              <div className={`grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm transition ${isDragging ? "scale-110" : "group-hover:scale-105"}`}>
                {hasItems ? <ImagePlus className="h-6 w-6 text-gray-700" /> : <Upload className="h-6 w-6 text-gray-700" />}
              </div>

              <div>
                <p className="text-lg font-semibold text-gray-900">{isDragging ? "Solte para adicionar" : hasItems ? "Adicionar mais imagens" : "Arraste ou selecione imagens"}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">Compatível com JPG, PNG e WEBP</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm">
                <FolderPlus className="h-3.5 w-3.5" />
                {items.length} arquivo(s) carregado(s)
              </div>
            </div>
          </label>

          <div className="rounded-3xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Imagens adicionadas</p>
                <p className="mt-1 text-sm text-gray-500">Revise e remova as imagens que não deseja processar.</p>
              </div>
              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{items.length}</div>
            </div>

            <div className="grid max-h-[320px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 scrollbar-thin">
              {items.length > 0 ? (
                items.map((item, index) => {
                  const statusCfg = STATUS_CONFIG[item.status];
                  return (
                    <div key={item.id} className={`relative overflow-hidden rounded-2xl border bg-white transition ${item.status === "error" ? "border-red-200" : item.status === "done" ? "border-emerald-200" : "border-gray-200"}`}>
                      <div className="aspect-[4/3] bg-gray-100 relative">
                        <img src={item.resultUrl ?? item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                        {item.status !== "idle" ? (
                          <div className="absolute bottom-2 left-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-1 p-3 pr-10">
                        <p className="truncate text-xs font-semibold text-gray-900">{index + 1}. {item.name}</p>
                        <p className={`text-[11px] ${statusCfg.color}`}>{statusCfg.label}</p>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remover ${item.name}`}
                        onClick={() => onRemove(item.id)}
                        className="absolute right-2 top-2 rounded-full bg-black/80 p-1.5 text-white transition hover:bg-black"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
                  Nenhuma imagem adicionada ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)]">
          <div>
            {singleItem ? (
              <div className="relative max-w-full overflow-hidden rounded-3xl border border-gray-200 bg-white lg:max-w-[560px]">
                <button
                  type="button"
                  aria-label={`Remover ${singleItem.name}`}
                  onClick={() => onRemove(singleItem.id)}
                  className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white transition hover:bg-black"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex min-h-[220px] max-h-[320px] items-center justify-center bg-gray-100 p-3 sm:p-4">
                  <img src={singleItem.resultUrl ?? singleItem.previewUrl} alt={singleItem.name} className="max-h-[288px] w-full object-contain" />
                </div>

                <div className="border-t border-gray-100 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="truncate text-sm font-semibold text-gray-900">{singleItem.name}</p>
                    <p className={`mt-1 text-[11px] ${STATUS_CONFIG[singleItem.status].color}`}>{STATUS_CONFIG[singleItem.status].label}</p>
                  </div>
                  {singleItem.status !== "idle" ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${singleItem.status === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : singleItem.status === "error" ? "border-red-200 bg-red-50 text-red-700" : singleItem.status === "processing" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[singleItem.status].dot}`} />
                      {STATUS_CONFIG[singleItem.status].label}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <label
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group block cursor-pointer rounded-3xl border-2 border-dashed p-6 transition ${isDragging ? "border-black bg-gray-100 scale-[1.01]" : "border-gray-200 bg-gray-50/70 hover:border-black hover:bg-gray-50"}`}
              >
                <input type="file" className="hidden" onChange={onFileChange} accept="image/*" multiple />
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 text-center">
                  <div className={`grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm transition ${isDragging ? "scale-110" : "group-hover:scale-105"}`}>
                    <Upload className="h-6 w-6 text-gray-700" />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-900">{isDragging ? "Solte para adicionar" : "Arraste ou selecione imagens"}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">Compatível com JPG, PNG e WEBP</p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm">
                    <FolderPlus className="h-3.5 w-3.5" />
                    Envie aqui
                  </div>

                  <p className="max-w-sm text-xs leading-relaxed text-gray-500">
                    Escolha o fundo agora e depois envie a foto para gerar com mais rapidez.
                  </p>
                </div>
              </label>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">02 Fundo</p>
                <p className="mt-1 text-sm text-gray-500">Escolha um cenário pronto ou envie um fundo próprio.</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                Atual: {activeBackgroundLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className={`relative block min-h-[88px] cursor-pointer overflow-hidden rounded-2xl border text-left transition focus-within:outline-none focus-within:ring-2 focus-within:ring-black/20 ${customBackgroundPreviewUrl ? "border-black shadow-md" : "border-gray-200 hover:border-gray-300 active:border-gray-400"}`}>
                  <input type="file" className="hidden" accept="image/*" onChange={onCustomBackgroundChange} />
                  {customBackgroundPreviewUrl ? <img src={customBackgroundPreviewUrl} alt="Fundo personalizado" className="absolute inset-0 h-full w-full object-cover" /> : null}
                  <div className={`absolute inset-0 ${customBackgroundPreviewUrl ? "bg-black/30" : "bg-gradient-to-br from-gray-900 to-gray-700"}`} />
                  <div className="relative flex min-h-[88px] items-end p-3">
                    <div className="flex w-full items-end justify-between gap-2">
                      <div>
                        <span className="block text-xs font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-sm">Fundo personalizado</span>
                        <span className="mt-1 block text-[11px] text-white/80">Clique para enviar arquivo</span>
                      </div>
                      {customBackgroundPreviewUrl ? <CheckCircle2 className="h-4 w-4 shrink-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" /> : <ImageUp className="h-4 w-4 shrink-0 text-white/90" />}
                    </div>
                  </div>
                </label>

                {customBackgroundPreviewUrl ? (
                  <button
                    type="button"
                    onClick={onRemoveCustomBackground}
                    className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                    aria-label="Remover fundo personalizado"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {variants.map((id) => {
                const variant = BACKGROUND_VARIANTS[id];
                const active = !customBackgroundPreviewUrl && id === background;
                const imageUrl = variant.images[0];

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectBackground(id)}
                    aria-pressed={active}
                    className={`relative min-h-[88px] overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${active ? "border-black shadow-md" : "border-gray-200 hover:border-gray-300 active:border-gray-400"}`}
                    style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  >
                    <div className={`absolute inset-0 ${active ? "bg-black/30" : "bg-black/45"}`} />
                    <div className="relative flex min-h-[88px] items-end p-3">
                      <div className="flex w-full items-end justify-between gap-2">
                        <span className="text-xs font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-sm">{variant.label}</span>
                        {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" /> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!singleItem ? <p className="text-xs leading-relaxed text-gray-500">Você pode deixar o fundo pronto antes mesmo de enviar a foto do veículo.</p> : null}
          </div>
        </div>
      )}
    </section>
  );
}
