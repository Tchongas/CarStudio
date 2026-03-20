import type { ChangeEventHandler, DragEventHandler } from "react";
import { ImagePlus, RefreshCw, Upload, X } from "lucide-react";

type UploadCardProps = {
  items: Array<{
    id: string;
    name: string;
    previewUrl: string;
    status: "idle" | "processing" | "done" | "error";
    resultUrl: string | null;
    error: string | null;
  }>;
  selectedId: string | null;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onDrop: DragEventHandler<HTMLLabelElement>;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
};

export function UploadCard({ items, selectedId, onFileChange, onDrop, onSelect, onRemove, onReset }: UploadCardProps) {
  const hasItems = items.length > 0;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">01</span>
            Upload das Fotos
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Envie várias imagens do mesmo carro para processar em sequência e acompanhar cada resultado.
          </p>
        </div>

        {hasItems ? (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpar tudo
          </button>
        ) : null}
      </div>

      <label onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="relative group cursor-pointer block">
        <input type="file" className="hidden" onChange={onFileChange} accept="image/*" multiple />
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 transition-all group-hover:border-black group-hover:bg-gray-50 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            {hasItems ? <ImagePlus className="w-6 h-6 text-gray-400 group-hover:text-black" /> : <Upload className="w-6 h-6 text-gray-400 group-hover:text-black" />}
          </div>
          <div>
            <p className="font-medium text-gray-900">{hasItems ? "Adicionar mais fotos" : "Clique ou arraste suas fotos"}</p>
            <p className="text-sm text-gray-500 mt-1">PNG, JPG ou WEBP • múltiplas imagens suportadas</p>
          </div>
        </div>
      </label>

      {hasItems ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Fila de imagens</p>
            <p className="text-xs text-gray-500">{items.length} arquivo(s)</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item, index) => {
              const isSelected = item.id === selectedId;
              const badge = item.status === "done" ? "Pronta" : item.status === "processing" ? "Processando" : item.status === "error" ? "Erro" : "Na fila";

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden rounded-2xl border text-left transition-all ${
                    isSelected ? "border-black ring-2 ring-black/10" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <button type="button" onClick={() => onSelect(item.id)} className="block w-full text-left">
                    <div className="aspect-[4/3] bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.resultUrl ?? item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>

                    <div className="space-y-1 p-3 pr-10">
                      <p className="truncate text-xs font-semibold text-gray-900">{index + 1}. {item.name}</p>
                      <p className="text-[11px] text-gray-500">{badge}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="absolute right-2 top-2 rounded-full bg-black/80 p-1.5 text-white transition hover:bg-black"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
