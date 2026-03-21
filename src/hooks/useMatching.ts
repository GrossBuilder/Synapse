"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSocket } from "./useSocket";
import { MatchRequest, MatchResult } from "@/types";

type MatchingStatus = "idle" | "searching" | "found" | "connecting" | "pre-screening" | "blocked";

export function useMatching() {
  const { emit, on, off, isConnected } = useSocket();
  const [status, setStatus] = useState<MatchingStatus>("idle");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!isConnected) return;

    const unsub1 = on("match-found", (data: unknown) => {
      setMatch(data as MatchResult);
      setStatus("found");
    });

    const unsub2 = on("match-searching", () => {
      setStatus("searching");
    });

    const unsub3 = on("queue-position", (pos: unknown) => {
      setQueuePosition(pos as number);
    });

    const unsub4 = on("partner-disconnected", () => {
      setMatch(null);
      setStatus("idle");
    });

    const unsub5 = on("pre-screen-blocked", (data: unknown) => {
      const d = data as { reason: string };
      setStatus("blocked");
      setBlockReason(d.reason || "Content policy violation");
    });

    cleanupRef.current = [unsub1, unsub2, unsub3, unsub4, unsub5];

    return () => {
      cleanupRef.current.forEach((fn) => fn());
    };
  }, [isConnected, on, off]);

  /**
   * Pre-screen: отправляет кадр камеры на проверку AI перед матчингом.
   * Возвращает true если разрешено, false если заблокировано.
   */
  const preScreen = useCallback(
    async (frameBase64: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setStatus("pre-screening");
        setBlockReason(null);

        // Слушаем ответ от сервера
        const handleResult = (data: unknown) => {
          const result = data as { allowed: boolean; reason?: string };
          off("pre-screen-result", handleResult);
          if (result.allowed) {
            resolve(true);
          } else {
            setStatus("blocked");
            setBlockReason(result.reason || "Content policy violation");
            resolve(false);
          }
        };
        on("pre-screen-result", handleResult);
        emit("pre-screen", { frame: frameBase64 });

        // Таймаут — если нет ответа за 6 сек, пропускаем
        setTimeout(() => {
          off("pre-screen-result", handleResult);
          resolve(true);
        }, 6000);
      });
    },
    [emit, on, off]
  );

  const joinQueue = useCallback(
    (request: MatchRequest) => {
      setStatus("searching");
      setBlockReason(null);
      emit("join-queue", request);
    },
    [emit]
  );

  const leaveQueue = useCallback(() => {
    setStatus("idle");
    setMatch(null);
    setBlockReason(null);
    emit("leave-queue");
  }, [emit]);

  const nextPartner = useCallback(
    (request: MatchRequest) => {
      setMatch(null);
      setStatus("searching");
      emit("next-partner", request);
    },
    [emit]
  );

  return {
    status,
    match,
    queuePosition,
    blockReason,
    joinQueue,
    leaveQueue,
    nextPartner,
    preScreen,
    isConnected,
  };
}
