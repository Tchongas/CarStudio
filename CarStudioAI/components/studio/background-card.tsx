import { CheckCircle2 } from "lucide-react";
import { BACKGROUND_VARIANTS, type BackgroundId } from "@/lib/ai/backgrounds";

type BackgroundCardProps = {
  background: BackgroundId;
  onSelectBackground: (id: BackgroundId) => void;
};

export function BackgroundCard({ background, onSelectBackground }: BackgroundCardProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">02</span>
        Escolha o Fundo
      </h2>

      <div className="space-y-3">
        {(Object.keys(BACKGROUND_VARIANTS) as BackgroundId[]).map((id) => (
          <button
            key={id}
            onClick={() => onSelectBackground(id)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              background === id
                ? "border-black bg-black text-white shadow-md"
                : "border-gray-100 bg-gray-50 hover:border-gray-300 text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{BACKGROUND_VARIANTS[id].label}</span>
              {background === id && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <p className={`text-xs ${background === id ? "text-gray-300" : "text-gray-500"}`}>
              {BACKGROUND_VARIANTS[id].description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
