import { ChevronRight, Loader2 } from "lucide-react";

type GenerateButtonProps = {
  canGenerate: boolean;
  isProcessing: boolean;
  isLoadingCredits: boolean;
  credits: number;
  pendingCount: number;
  totalCount: number;
  onGenerateSelected: () => void;
  onGenerateAll: () => void;
};

export function GenerateButton({
  canGenerate,
  isProcessing,
  isLoadingCredits,
  credits,
  pendingCount,
  totalCount,
  onGenerateSelected,
  onGenerateAll,
}: GenerateButtonProps) {
  const disabled = !canGenerate || isProcessing || isLoadingCredits || credits < 1;
  const disableBatch = disabled || pendingCount < 1;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Processamento</p>
            <p className="mt-1 text-sm text-gray-600">
              {totalCount > 0 ? `${pendingCount} imagem(ns) aguardando processamento` : "Adicione imagens para começar"}
            </p>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {isLoadingCredits ? "..." : `${credits} crédito(s)`}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={onGenerateSelected}
            disabled={disabled}
            className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              disabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-lg shadow-black/10"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : isLoadingCredits ? (
              "Carregando créditos..."
            ) : credits < 1 ? (
              "Sem créditos"
            ) : (
              <>
                Gerar imagem atual
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={onGenerateAll}
            disabled={disableBatch}
            className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              disableBatch
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "border border-black text-black hover:bg-gray-50 active:scale-[0.98]"
            }`}
          >
            Gerar pendentes
            <span className="rounded-full bg-black px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">{pendingCount}</span>
          </button>
        </div>

        {credits < 1 ? <p className="mt-3 text-sm text-red-500">Você não tem créditos suficientes.</p> : null}
      </div>
    </div>
  );
}
