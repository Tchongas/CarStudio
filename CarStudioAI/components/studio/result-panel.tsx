import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowLeftRight, Download, Image as ImageIcon } from "lucide-react";

type ResultPanelProps = {
  selectedItem: {
    id: string;
    name: string;
    previewUrl: string;
    status: "idle" | "processing" | "done" | "error";
    resultUrl: string | null;
    error: string | null;
  } | null;
  isProcessing: boolean;
  onDownload: () => void;
  onRetry: () => void;
  totals: {
    total: number;
    ready: number;
    failed: number;
    pending: number;
  };
};

export function ResultPanel({ selectedItem, isProcessing, onDownload, onRetry, totals }: ResultPanelProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const resultUrl = selectedItem?.resultUrl ?? null;
  const error = selectedItem?.error ?? null;
  const hasItems = totals.total > 0;
  const progressPercent = totals.total > 0 ? Math.round((totals.ready / totals.total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resultado</h2>
          <p className="mt-1 text-sm text-gray-600 truncate">{selectedItem ? selectedItem.name : hasItems ? "Selecione uma imagem para acompanhar" : "Envie uma imagem para começar"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {resultUrl && selectedItem ? (
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${showOriginal ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              title={showOriginal ? "Ver resultado" : "Ver original"}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {showOriginal ? "Original" : "Comparar"}
            </button>
          ) : null}
          {resultUrl ? (
            <button onClick={onDownload} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800">
              <Download className="w-3.5 h-3.5" />
              Baixar
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 relative bg-[#111] flex items-center justify-center p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {isProcessing && selectedItem ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-white"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white/50" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium">Transformando {selectedItem.name}...</p>
                <p className="text-xs text-white/40 mt-1">Isso pode levar alguns segundos</p>
              </div>
            </motion.div>
          ) : resultUrl ? (
            <motion.div
              key={showOriginal ? "original" : "result"}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showOriginal && selectedItem ? selectedItem.previewUrl : resultUrl}
                alt={showOriginal ? "Original" : "Resultado"}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
              {showOriginal ? (
                <div className="absolute top-4 left-4 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                  Original
                </div>
              ) : null}
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 text-red-400 max-w-md text-center"
            >
              <AlertCircle className="w-12 h-12" />
              <div>
                <p className="font-bold text-lg">Ops!</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
              <button
                onClick={onRetry}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors"
              >
                Tentar Novamente
              </button>
            </motion.div>
          ) : selectedItem ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full flex flex-col items-center justify-center gap-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedItem.previewUrl} alt={selectedItem.name} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg opacity-90" />
              <p className="text-xs text-white/45">Prévia original selecionada. Gere para ver o resultado final aqui.</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex max-w-sm flex-col items-center gap-4 text-center text-white/20"
            >
              <div className="w-24 h-24 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/60">Aguardando geração</p>
                <p className="mt-2 text-xs leading-relaxed text-white/35">Faça upload da foto, escolha o fundo e acompanhe aqui o resultado final pronto para download.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
        {hasItems ? (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Progresso</p>
              <p className="text-xs font-semibold text-gray-700">{progressPercent}%</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Total</p>
            <p className="mt-1.5 text-xl sm:text-2xl font-semibold text-gray-900">{totals.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-600">Prontas</p>
            <p className="mt-1.5 text-xl sm:text-2xl font-semibold text-emerald-700">{totals.ready}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Pendentes</p>
            <p className="mt-1.5 text-xl sm:text-2xl font-semibold text-gray-900">{totals.pending}</p>
          </div>
          <div className={`rounded-2xl border p-3 sm:p-4 ${totals.failed > 0 ? "border-red-200 bg-red-50/50" : "border-gray-200 bg-white"}`}>
            <p className={`text-[11px] uppercase tracking-[0.18em] ${totals.failed > 0 ? "text-red-600" : "text-gray-400"}`}>Com erro</p>
            <p className={`mt-1.5 text-xl sm:text-2xl font-semibold ${totals.failed > 0 ? "text-red-700" : "text-gray-900"}`}>{totals.failed}</p>
          </div>
        </div>

        {!hasItems ? <p className="mt-4 text-xs leading-relaxed text-gray-500">Quando você enviar imagens, este painel passa a mostrar a prévia, o processamento e o arquivo final para download.</p> : null}
      </div>
    </div>
  );
}
