"use client";

import { useRef, useCallback, useState } from "react";

interface PeerState {
  socketId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

interface UseGroupWebRTCOptions {
  onPeerStream?: (socketId: string, stream: MediaStream) => void;
  onPeerDisconnected?: (socketId: string) => void;
  onIceCandidate?: (targetSocketId: string, candidate: RTCIceCandidateInit) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
      }]
    : []),
];

export function useGroupWebRTC(options: UseGroupWebRTCOptions = {}) {
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, PeerState>>(new Map());
  const [peerStreams, setPeerStreams] = useState<Map<string, { stream: MediaStream; userName: string; userImage: string | null }>>(new Map());

  const getLocalStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStream.current = stream;
    return stream;
  }, []);

  const createPeerConnection = useCallback((
    targetSocketId: string,
    userId: string,
    userName: string,
    userImage: string | null,
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        options.onIceCandidate?.(targetSocketId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        const stream = event.streams[0];
        const peer = peers.current.get(targetSocketId);
        if (peer) peer.stream = stream;
        options.onPeerStream?.(targetSocketId, stream);
        setPeerStreams((prev) => {
          const next = new Map(prev);
          next.set(targetSocketId, { stream, userName, userImage });
          return next;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        options.onPeerDisconnected?.(targetSocketId);
      }
    };

    // Добавляем локальные треки
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
      });
    }

    peers.current.set(targetSocketId, {
      socketId: targetSocketId,
      userId,
      userName,
      userImage,
      connection: pc,
      stream: null,
    });

    return pc;
  }, [options]);

  /** Создать offer для нового пира (вызывается когда к тебе подключился новый участник) */
  const createOffer = useCallback(async (
    targetSocketId: string,
    userId: string,
    userName: string,
    userImage: string | null,
  ): Promise<RTCSessionDescriptionInit> => {
    const pc = createPeerConnection(targetSocketId, userId, userName, userImage);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }, [createPeerConnection]);

  /** Принять offer и создать answer */
  const createAnswer = useCallback(async (
    senderSocketId: string,
    userId: string,
    userName: string,
    userImage: string | null,
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> => {
    let peer = peers.current.get(senderSocketId);
    let pc: RTCPeerConnection;
    if (!peer) {
      pc = createPeerConnection(senderSocketId, userId, userName, userImage);
    } else {
      pc = peer.connection;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }, [createPeerConnection]);

  /** Установить answer для существующего пира */
  const setRemoteAnswer = useCallback(async (
    targetSocketId: string,
    answer: RTCSessionDescriptionInit,
  ) => {
    const peer = peers.current.get(targetSocketId);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  /** Добавить ICE-кандидат */
  const addIceCandidate = useCallback(async (
    senderSocketId: string,
    candidate: RTCIceCandidateInit,
  ) => {
    const peer = peers.current.get(senderSocketId);
    if (peer) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  /** Удалить пира (при выходе из комнаты) */
  const removePeer = useCallback((socketId: string) => {
    const peer = peers.current.get(socketId);
    if (peer) {
      peer.connection.close();
      peers.current.delete(socketId);
      setPeerStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStream.current) {
      const track = localStream.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        return track.enabled;
      }
    }
    return false;
  }, []);

  const toggleMic = useCallback(() => {
    if (localStream.current) {
      const track = localStream.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        return track.enabled;
      }
    }
    return false;
  }, []);

  const cleanup = useCallback(() => {
    for (const peer of peers.current.values()) {
      peer.connection.close();
    }
    peers.current.clear();
    setPeerStreams(new Map());
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
  }, []);

  return {
    localStream,
    peerStreams,
    getLocalStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    removePeer,
    toggleCamera,
    toggleMic,
    cleanup,
  };
}
