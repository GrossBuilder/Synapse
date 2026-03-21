"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // ms

export function useSocket() {
  const socket = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const { data: session } = useSession();

  useEffect(() => {
    // Не подключаемся без сессии — нужен JWT для авторизации
    if (!session) return;

    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: RECONNECT_DELAY_BASE,
        reconnectionDelayMax: 10000,
        auth: {
          token: (session as unknown as { socketToken?: string }).socketToken || "",
        },
      }
    );

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setReconnectAttempt(0);
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      // Если сервер явно разорвал — не реконнект автоматически (только socket.io managed)
      if (reason === "io server disconnect") {
        // Сервер закрыл соединение, пробуем переподключиться
        socketInstance.connect();
      }
    });

    socketInstance.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
      setIsConnected(false);
    });

    socketInstance.io.on("reconnect_attempt", (attempt) => {
      setReconnectAttempt(attempt);
    });

    socketInstance.io.on("reconnect", () => {
      setReconnectAttempt(0);
    });

    socketInstance.io.on("reconnect_failed", () => {
      console.error("[Socket] Reconnection failed after max attempts");
    });

    socket.current = socketInstance;

    return () => {
      socketInstance.disconnect();
    };
  }, [session]);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socket.current) {
      socket.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    if (socket.current) {
      socket.current.on(event, callback);
    }
    return () => {
      socket.current?.off(event, callback);
    };
  }, []);

  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    if (socket.current) {
      socket.current.off(event, callback);
    }
  }, []);

  return { socket: socket.current, isConnected, reconnectAttempt, emit, on, off };
}
