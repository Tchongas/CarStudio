import { Camera, Lightbulb, Sparkles } from "lucide-react";

export function StudioFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5">
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Dica de foto</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Fotografe o veículo de frente ou 3/4, com boa iluminação natural para melhores resultados.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Qualidade</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Use imagens de alta resolução (1280px+) para que a IA preserve os detalhes do veículo.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Fundo ideal</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Estúdio Branco e Dark Premium são os mais populares para anúncios em marketplaces.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-100 pt-4 sm:flex-row">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
            Car Studio AI &mdash; Fotografia automotiva profissional
          </p>
          <p className="text-[10px] text-gray-400">
            &copy; {new Date().getFullYear()} Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
