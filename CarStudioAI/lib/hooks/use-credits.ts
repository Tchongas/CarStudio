"use client";

import { useCallback, useState } from "react";

type CreditsResponse = {
  creditsBalance?: number;
  error?: string;
};

/**
 * Hook that manages credit balance state.
 * Accepts a getAccessToken function (from useAuth) to authenticate API calls.
 */
export function useCredits(getAccessToken: () => Promise<string | null>) {
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setCredits(0);
      setIsLoading(false);
      return { balance: 0, error: "NO_TOKEN" as const };
    }

    try {
      const response = await fetch("/api/credits", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const payload = (await response.json()) as CreditsResponse;

      if (!response.ok || payload.error) {
        setCredits(0);
        return { balance: 0, error: payload.error ?? "FETCH_FAILED" };
      }

      const balance = Math.max(payload.creditsBalance ?? 0, 0);
      setCredits(balance);
      return { balance, error: null };
    } catch {
      setCredits(0);
      return { balance: 0, error: "NETWORK_ERROR" };
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  const updateBalance = useCallback((newBalance: number) => {
    setCredits(Math.max(newBalance, 0));
  }, []);

  return {
    credits,
    isLoading,
    refresh,
    updateBalance,
  };
}
