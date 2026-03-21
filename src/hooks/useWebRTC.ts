"use client";

import { useRef, useCallback, useState } from "react";

interface UseWebRTCOptions {
  onTrack?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // TURN servers for NAT traversal — configured via env
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
      }]
    : []),
];

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use ref for callbacks to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error("Ошибка доступа к камере/микрофону:", error);
      throw error;
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        optionsRef.current.onIceCandidate?.(event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        optionsRef.current.onTrack?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === "connected");
      optionsRef.current.onConnectionStateChange?.(pc.connectionState);
    };

    // Добавляем локальные треки
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
      });
    }

    peerConnection.current = pc;
    return pc;
  }, []);

  const createOffer = useCallback(async () => {
    setIsLoading(true);
    try {
      const pc = peerConnection.current || createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } finally {
      setIsLoading(false);
    }
  }, [createPeerConnection]);

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      setIsLoading(true);
      try {
        const pc = peerConnection.current || createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        return answer;
      } finally {
        setIsLoading(false);
      }
    },
    [createPeerConnection]
  );

  const setRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    },
    []
  );

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    },
    []
  );

  const screenStream = useRef<MediaStream | null>(null);

  const toggleCamera = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  const toggleMic = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });
      screenStream.current = stream;

      // Заменяем видео-трек в PeerConnection
      const videoTrack = stream.getVideoTracks()[0];
      if (peerConnection.current && videoTrack) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        }
      }

      // При нажатии "Остановить демонстрацию" в браузере
      videoTrack.onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch {
      return null;
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
    }

    // Возвращаем камеру в PeerConnection
    if (peerConnection.current && localStream.current) {
      const cameraTrack = localStream.current.getVideoTracks()[0];
      if (cameraTrack) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (screenStream.current) {
      screenStream.current.getTracks().forEach((track) => track.stop());
      screenStream.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    localStream,
    screenStream,
    peerConnection,
    isConnected,
    isLoading,
    getLocalStream,
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleCamera,
    toggleMic,
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
}
