"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { AlertTriangle, ChevronRight, Info, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { BACKGROUND_VARIANTS, type BackgroundId } from "@/lib/ai/backgrounds";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BackgroundStrip } from "@/components/studio/background-strip";
import { GenerationPanel } from "@/components/studio/generation-panel";
import { ResultPanel } from "@/components/studio/result-panel";
import { StudioFooter } from "@/components/studio/studio-footer";
import { StudioHeader } from "@/components/studio/studio-header";
import type { QueueItem } from "@/components/studio/types";
import { UploadGalleryPanel } from "@/components/studio/upload-gallery-panel";

type UserPreview = {
  email: string;
};

type CreditsResponse = {
  creditsBalance?: number;
  email?: string;
  error?: string;
};

type GenerateResponse = CreditsResponse & {
  imageUrl?: string;
};

export function StudioApp() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundId>("white");
  const [customBackgroundFile, setCustomBackgroundFile] = useState<File | null>(null);
  const [customBackgroundPreviewUrl, setCustomBackgroundPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [credits, setCredits] = useState(0);
  const [user, setUser] = useState<UserPreview | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const isModeOne = items.length === 1;
  const isModeTwo = items.length > 1;
  const modeOneCtaMessage = isProcessing
    ? "Sua geração está em andamento. Aguarde alguns segundos."
    : isLoadingCredits
      ? "Carregando créditos disponíveis."
      : credits < 1
        ? "Você precisa de pelo menos 1 crédito para gerar esta imagem."
        : "Tudo pronto. Gere sua imagem com o fundo configurado.";
  const totals = {
    total: items.length,
    ready: items.filter((item) => item.status === "done").length,
    failed: items.filter((item) => item.status === "error").length,
    pending: items.filter((item) => item.status === "idle").length,
  };

  const getAccessToken = useCallback(async () => {
    if (!supabase) {
      return null;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const refreshCredits = useCallback(async () => {
    if (!supabase) {
      setCredits(0);
      setIsLoadingCredits(false);
      return;
    }

    setIsLoadingCredits(true);
    const accessToken = await getAccessToken();

    try {
      const response = await fetch("/api/credits", {
        method: "GET",
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });

      const payload = (await response.json()) as CreditsResponse;

      if (!response.ok || payload.error) {
        setCredits(0);
        setAuthNotice(payload.error ?? "Não foi possível carregar seus créditos.");
        return;
      }

      setCredits(payload.creditsBalance ?? 0);
      setUser(payload.email ? { email: payload.email } : null);
    } catch {
      setCredits(0);
      setAuthNotice("Não foi possível carregar seus créditos.");
    } finally {
      setIsLoadingCredits(false);
    }
  }, [getAccessToken, supabase]);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingCredits(false);
      return;
    }

    supabase.auth.getUser().then(async ({ data }: { data: { user: User | null } }) => {
      const email = data.user?.email;
      if (email) {
        setUser({ email });
      }

      await refreshCredits();
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      const email = session?.user?.email;
      setUser(email ? { email } : null);

      await refreshCredits();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [refreshCredits, supabase]);

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
      setAuthNotice("Por favor, selecione apenas arquivos de imagem válidos.");
      return;
    }

    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    setItems((current) => [
      ...current,
      {
        id,
        file,
        name: file.name,
        previewUrl,
        status: "idle",
        resultUrl: null,
        error: null,
      },
    ]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(processFileUpload);
    e.target.value = "";
  };

  const onDrop = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    files.forEach(processFileUpload);
  }, []);

  const handleCustomBackgroundChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAuthNotice("Envie um arquivo de imagem válido para o fundo personalizado.");
      e.target.value = "";
      return;
    }

    if (customBackgroundPreviewUrl) {
      URL.revokeObjectURL(customBackgroundPreviewUrl);
    }

    setCustomBackgroundFile(file);
    setCustomBackgroundPreviewUrl(URL.createObjectURL(file));
    setAuthNotice(null);
    e.target.value = "";
  };

  const removeCustomBackground = useCallback(() => {
    if (customBackgroundPreviewUrl) {
      URL.revokeObjectURL(customBackgroundPreviewUrl);
    }

    setCustomBackgroundFile(null);
    setCustomBackgroundPreviewUrl(null);
  }, [customBackgroundPreviewUrl]);

  const handleSelectPresetBackground = useCallback((id: BackgroundId) => {
    if (customBackgroundPreviewUrl) {
      URL.revokeObjectURL(customBackgroundPreviewUrl);
    }

    setCustomBackgroundFile(null);
    setCustomBackgroundPreviewUrl(null);
    setBackground(id);
  }, [customBackgroundPreviewUrl]);

  const generateForItem = useCallback(async (itemId: string) => {
    const currentItem = items.find((item) => item.id === itemId);

    if (!currentItem || isProcessing) {
      return;
    }

    if (credits < 1) {
      setAuthNotice("Você não tem créditos suficientes para gerar imagens.");
      return;
    }

    const accessToken = await getAccessToken();

    setIsProcessing(true);
    setAuthNotice(null);
    setSelectedItemId(itemId);
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "processing",
              error: null,
            }
          : item,
      ),
    );

    try {
      const base64 = await fileToBase64(currentItem.file);
      const customBackgroundBase64 = customBackgroundFile ? await fileToBase64(customBackgroundFile) : null;
      const requestId = crypto.randomUUID();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          base64Image: base64,
          mimeType: currentItem.file.type,
          background,
          customBackgroundBase64,
          customBackgroundMimeType: customBackgroundFile?.type ?? null,
          requestId,
        }),
      });

      const payload = (await response.json()) as GenerateResponse;

      if (typeof payload.creditsBalance === "number") {
        setCredits(Math.max(payload.creditsBalance, 0));
      }

      if (!response.ok || payload.error) {
        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "error",
                  error: payload.error ?? "Ocorreu um erro inesperado. Tente novamente.",
                }
              : item,
          ),
        );
        return;
      }

      if (payload.imageUrl) {
        setItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "done",
                  resultUrl: payload.imageUrl ?? null,
                  error: null,
                }
              : item,
          ),
        );
      }
    } catch {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "error",
                error: "Ocorreu um erro inesperado. Tente novamente.",
              }
            : item,
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  }, [background, credits, customBackgroundFile, getAccessToken, isProcessing, items]);

  const handleGenerateSelected = async () => {
    if (!selectedItemId) {
      setAuthNotice("Selecione uma imagem para gerar.");
      return;
    }

    await generateForItem(selectedItemId);
  };

  const handleGenerateAll = async () => {
    for (const item of items) {
      if (item.status === "idle") {
        await generateForItem(item.id);
      }
    }
  };

  const handleDownload = () => {
    if (!selectedItem?.resultUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = selectedItem.resultUrl;
    link.download = `car-studio-${background}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeItem = (itemId: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === itemId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      const next = current.filter((item) => item.id !== itemId);

      if (selectedItemId === itemId) {
        setSelectedItemId(next[0]?.id ?? null);
      }

      return next;
    });
  };

  const removeCompletedItems = () => {
    setItems((current) => {
      current.forEach((item) => {
        if (item.status === "done") {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      const next = current.filter((item) => item.status !== "done");

      if (!next.some((item) => item.id === selectedItemId)) {
        setSelectedItemId(next[0]?.id ?? null);
      }

      return next;
    });
  };

  const reset = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });

    if (customBackgroundPreviewUrl) {
      URL.revokeObjectURL(customBackgroundPreviewUrl);
    }

    setItems([]);
    setSelectedItemId(null);
    setCustomBackgroundFile(null);
    setCustomBackgroundPreviewUrl(null);
    setAuthNotice(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <StudioHeader credits={credits} isLoadingCredits={isLoadingCredits} userEmail={user?.email ?? null} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {authNotice ? (
          <section
            className="animate-[slideDown_0.3s_ease-out] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="flex-1 text-sm text-amber-800">{authNotice}</p>
              <button
                type="button"
                onClick={() => setAuthNotice(null)}
                className="shrink-0 rounded-full p-1 text-amber-600 transition hover:bg-amber-100"
                aria-label="Fechar aviso"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        ) : null}

        <UploadGalleryPanel
          items={items}
          background={background}
          customBackgroundPreviewUrl={customBackgroundPreviewUrl}
          onSelectBackground={handleSelectPresetBackground}
          onFileChange={handleFileChange}
          onDrop={onDrop}
          onCustomBackgroundChange={handleCustomBackgroundChange}
          onRemoveCustomBackground={removeCustomBackground}
          onRemove={removeItem}
          onReset={reset}
          onRemoveCompleted={removeCompletedItems}
        />

        {isModeTwo ? (
          <>
            <BackgroundStrip
              background={background}
              customBackgroundPreviewUrl={customBackgroundPreviewUrl}
              onSelectBackground={handleSelectPresetBackground}
              onCustomBackgroundChange={handleCustomBackgroundChange}
              onRemoveCustomBackground={removeCustomBackground}
            />
          </>
        ) : null}

        {isModeOne ? (
          <section className={`rounded-3xl border p-4 shadow-sm sm:p-6 transition-colors ${isProcessing ? "border-blue-200 bg-blue-50/30" : credits < 1 && !isLoadingCredits ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-white"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">03 Gerar</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {isProcessing ? "Sua imagem está sendo processada..." : "Quando estiver pronto, gere sua imagem com o fundo escolhido."}
                </p>
                {!isProcessing && credits < 1 && !isLoadingCredits ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Sem créditos disponíveis
                  </p>
                ) : !isProcessing ? (
                  <p className="mt-2 text-xs font-medium text-gray-500">{modeOneCtaMessage}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleGenerateSelected}
                disabled={!selectedItem || isProcessing || isLoadingCredits || credits < 1}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed sm:w-auto sm:min-w-[260px] ${isProcessing ? "bg-blue-600 text-white cursor-wait" : "bg-black text-white hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400"}`}
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="truncate">Processando...</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                    <span className="truncate">Gerar imagem</span>
                    <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider">1 Crédito</span>
                  </>
                )}
              </button>
            </div>
          </section>
        ) : isModeTwo ? (
          <GenerationPanel
            credits={credits}
            isLoadingCredits={isLoadingCredits}
            isProcessing={isProcessing}
            pendingCount={totals.pending}
            items={items}
            selectedItemId={selectedItemId}
            selectedImageUrl={selectedItem ? (selectedItem.resultUrl ?? selectedItem.previewUrl) : null}
            selectedBackgroundLabel={BACKGROUND_VARIANTS[background].label}
            hasSelection={Boolean(selectedItem)}
            canGenerateSelected={Boolean(selectedItem) && !isProcessing && !isLoadingCredits && credits > 0}
            canGenerateAll={totals.pending > 0 && !isProcessing && !isLoadingCredits && credits > 0}
            onSelectItem={setSelectedItemId}
            onGenerateSelected={handleGenerateSelected}
            onGenerateAll={handleGenerateAll}
          />
        ) : null}

        <ResultPanel
          selectedItem={selectedItem}
          isProcessing={isProcessing}
          onDownload={handleDownload}
          onRetry={handleGenerateSelected}
          totals={totals}
        />
      </main>

      <StudioFooter />
    </div>
  );
}
