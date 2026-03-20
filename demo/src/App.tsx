import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Download, Loader2, RefreshCw, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processCarImage, BACKGROUND_VARIANTS, BackgroundId } from './services/geminiService';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundId>('white');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  }, []);

  const processFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    reset();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const result = await processCarImage(base64, selectedFile.type, background);

      if (result.error) {
        setError(result.error);
      } else if (result.imageUrl) {
        setResultUrl(result.imageUrl);
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `car-studio-${background}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <ImageIcon className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">CAR STUDIO <span className="text-gray-400 font-medium">MVP</span></h1>
        </div>
        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">
          Professional Automotive Photography AI
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Config */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">01</span>
              Upload da Foto
            </h2>
            
            {!previewUrl ? (
              <label 
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="relative group cursor-pointer block"
              >
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 transition-all group-hover:border-black group-hover:bg-gray-50 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-black" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Clique ou arraste a foto</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG ou WEBP</p>
                  </div>
                </div>
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-[4/3] bg-gray-50 group">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                <button 
                  onClick={reset}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">02</span>
              Escolha o Fundo
            </h2>
            
            <div className="space-y-3">
              {(Object.keys(BACKGROUND_VARIANTS) as BackgroundId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setBackground(id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    background === id 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-gray-100 bg-gray-50 hover:border-gray-300 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{BACKGROUND_VARIANTS[id].label}</span>
                    {background === id && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <p className={`text-xs ${background === id ? 'text-gray-300' : 'text-gray-500'}`}>
                    {BACKGROUND_VARIANTS[id].description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={handleGenerate}
            disabled={!selectedFile || isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              !selectedFile || isProcessing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-lg shadow-black/10'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                Gerar Fotografia Profissional
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resultado</h2>
              {resultUrl && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 text-sm font-bold hover:text-gray-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar Imagem
                </button>
              )}
            </div>

            <div className="flex-1 relative bg-[#111] flex items-center justify-center p-8">
              <AnimatePresence mode="wait">
                {isProcessing ? (
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
                      <p className="font-medium">Transformando seu carro...</p>
                      <p className="text-xs text-white/40 mt-1">Isso pode levar alguns segundos</p>
                    </div>
                  </motion.div>
                ) : resultUrl ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <img 
                      src={resultUrl} 
                      alt="Result" 
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                    />
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
                      onClick={handleGenerate}
                      className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors"
                    >
                      Tentar Novamente
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 text-white/20"
                  >
                    <div className="w-24 h-24 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-medium">Aguardando geração</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Pintura Preservada</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Cores e reflexos originais mantidos com precisão.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Fundo Profissional</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Substituição completa por ambiente de estúdio.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase">Luz & Sombra</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Iluminação comercial e sombras de contato realistas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 text-center">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">
        </p>
      </footer>
    </div>
  );
}
