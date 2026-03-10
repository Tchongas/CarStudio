"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Loader2,
  LogIn,
  RefreshCw,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { BACKGROUND_VARIANTS, type BackgroundId } from "@/lib/ai/backgrounds";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const GUEST_CREDITS_KEY = "carstudio_guest_credits";

type UserPreview = {
  email: string;
};

function getInitialGuestCredits() {
  if (typeof window === "undefined") {
    return 2;
  }

  const persisted = window.localStorage.getItem(GUEST_CREDITS_KEY);
  if (persisted === null) {
    window.localStorage.setItem(GUEST_CREDITS_KEY, "2");
    return 2;
  }

  const parsed = Number(persisted);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
}

export function StudioApp() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundId>("white");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(2);
  const [user, setUser] = useState<UserPreview | null>(null);
  const [emailForMagicLink, setEmailForMagicLink] = useState("");
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    setCredits(getInitialGuestCredits());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUEST_CREDITS_KEY, String(credits));
    }
  }, [credits]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const email = data.user?.email;
      if (email) {
        setUser({ email });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const email = session?.user?.email;
      setUser(email ? { email } : null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (readerError) => reject(readerError);
    });
  };

  const processFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    reset(false);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const onDrop = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile || isProcessing) {
      return;
    }

    if (credits < 1) {
      setError("Você não tem créditos suficientes para gerar imagens.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64Image: base64,
          mimeType: selectedFile.type,
          background,
        }),
      });

      const payload = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Ocorreu um erro inesperado. Tente novamente.");
        return;
      }

      if (payload.imageUrl) {
        setResultUrl(payload.imageUrl);
        setCredits((prev: number) => Math.max(prev - 1, 0));
      }
    } catch {
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `car-studio-${background}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = (clearSelectedFile = true) => {
    if (clearSelectedFile) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }

    setResultUrl(null);
    setError(null);
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      setAuthNotice("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar login.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setAuthNotice(signInError.message);
    }
  };

  const signInWithEmail = async () => {
    if (!supabase) {
      setAuthNotice("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar login.");
      return;
    }

    const email = emailForMagicLink.trim();
    if (!email) {
      setAuthNotice("Informe um e-mail válido para receber o link de acesso.");
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (otpError) {
      setAuthNotice(otpError.message);
      return;
    }

    setAuthNotice("Link de acesso enviado para seu e-mail.");
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setAuthNotice("Sessão encerrada.");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <ImageIcon className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">
            CAR STUDIO <span className="text-gray-400 font-medium">PRO</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-bold tracking-widest uppercase">
            Créditos: {credits}
          </div>
          <div className="text-xs font-mono text-gray-500 uppercase tracking-widest hidden md:block">
            Professional Automotive Photography AI
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">00</span>
              Conta
            </h2>

            <div className="space-y-3">
              {user ? (
                <>
                  <p className="text-sm text-gray-700">Logado como <span className="font-semibold">{user.email}</span></p>
                  <button
                    onClick={signOut}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold hover:bg-gray-50"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={signInWithGoogle}
                    className="w-full rounded-xl bg-black text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Entrar com Google
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailForMagicLink}
                      onChange={(e) => setEmailForMagicLink(e.target.value)}
                      placeholder="seu@email.com"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
                    />
                    <button
                      onClick={signInWithEmail}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      Email
                    </button>
                  </div>
                </>
              )}
              {authNotice ? <p className="text-xs text-gray-500">{authNotice}</p> : null}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">01</span>
              Upload da Foto
            </h2>

            {!previewUrl ? (
              <label onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="relative group cursor-pointer block">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                <button
                  onClick={() => reset(true)}
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

          <button
            onClick={handleGenerate}
            disabled={!selectedFile || isProcessing || credits < 1}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              !selectedFile || isProcessing || credits < 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-lg shadow-black/10"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : credits < 1 ? (
              "Sem créditos"
            ) : (
              <>
                Gerar Fotografia Profissional
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
          {credits < 1 ? <p className="text-sm text-red-500">Você não tem créditos suficientes.</p> : null}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resultado</h2>
              {resultUrl ? (
                <button onClick={handleDownload} className="flex items-center gap-2 text-sm font-bold hover:text-gray-600 transition-colors">
                  <Download className="w-4 h-4" />
                  Baixar Imagem
                </button>
              ) : null}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resultUrl} alt="Result" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
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
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
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

      <footer className="bg-white border-t border-gray-200 px-6 py-4 text-center">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">
          Powered by Gemini 2.5 Flash Image • No Data Stored • Instant Generation
        </p>
      </footer>
    </div>
  );
}
