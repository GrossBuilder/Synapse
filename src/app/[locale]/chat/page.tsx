"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import TrustBadge from "@/components/TrustBadge";
import PeerInfo from "@/components/PeerInfo";
import ChatLimitBanner from "@/components/ChatLimitBanner";
import ReportModal from "@/components/ReportModal";
import RatingModal from "@/components/RatingModal";
import { IconButton } from "@/components/ui";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useSocket } from "@/hooks/useSocket";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getCategoryBySlug } from "@/lib/categories";
import type { ChatMessage, TrustBadge as TrustBadgeType, SubscriptionPlan } from "@/types";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const t = useTranslations();

  const categorySlug = searchParams.get("category") || "tech";
  const regionSlug = searchParams.get("region") || "global";
  const subsParam = searchParams.get("subs");
  const tagsParam = searchParams.get("tags");
  const category = getCategoryBySlug(categorySlug);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnectedToPeer, setIsConnectedToPeer] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Trust Score / Peer / Subscription state
  const [myBadge, setMyBadge] = useState<TrustBadgeType>("regular");
  const [peerBadge, setPeerBadge] = useState<TrustBadgeType | null>(null);
  const [peerName, setPeerName] = useState<string>("");
  const [peerImage, setPeerImage] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [chatUsed, setChatUsed] = useState(0);
  const [chatLimit, setChatLimit] = useState(15);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const [showReport, setShowReport] = useState(false);
  const [skipWarning, setSkipWarning] = useState<number | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingPeer, setRatingPeer] = useState<{ name: string; id: string; sessionId: string } | null>(null);
  const [lastPeer, setLastPeer] = useState<{ name: string; id: string; sessionId: string } | null>(null);

  const { on, emit, isConnected } = useSocket();
  const { showNotification } = usePushNotifications();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const skipWarningTimer = useRef<NodeJS.Timeout | null>(null);

  // Refs to avoid stale closures in socket listeners
  const peerNameRef = useRef(peerName);
  const peerIdRef = useRef(peerId);
  const sessionIdRef = useRef(sessionId);
  peerNameRef.current = peerName;
  peerIdRef.current = peerId;
  sessionIdRef.current = sessionId;

  const webrtc = useWebRTC({
    onTrack: (stream) => setRemoteStream(stream),
    onIceCandidate: (candidate) => {
      if (sessionIdRef.current) {
        emit("signal", { type: "ice-candidate", sessionId: sessionIdRef.current, data: candidate });
      }
    },
    onConnectionStateChange: (state) => {
      setIsConnectedToPeer(state === "connected");
    },
  });

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await webrtc.getLocalStream();
        setLocalStream(stream);
        setCameraError(false);
      } catch {
        setCameraError(true);
      }
    };
    initCamera();

    return () => {
      webrtc.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Автоматический вход в очередь при подключении сокета
  useEffect(() => {
    if (!isConnected || !session?.user) return;

    const subcategorySlugs = subsParam ? subsParam.split(",").filter(Boolean) : [];
    const tags = tagsParam ? decodeURIComponent(tagsParam).split(",").filter(Boolean) : [];

    emit("join-queue", {
      userId: (session.user as { id?: string }).id || session.user.name || "anon",
      userName: session.user.name || "User",
      userImage: session.user.image || null,
      categorySlug,
      subcategorySlugs,
      tags,
      regionSlug,
    });
  }, [isConnected, session, categorySlug, subsParam, tagsParam, emit]);

  // Socket listeners for Trust Score, Peer, Subscription
  useEffect(() => {
    const unsubs = [
      on("trust-badge", (data: unknown) => {
        const d = data as { badge: TrustBadgeType };
        setMyBadge(d.badge);
      }),
      on("peer-badge", (data: unknown) => {
        const d = data as { badge: TrustBadgeType };
        setPeerBadge(d.badge);
      }),
      on("match-found", (data: unknown) => {
        const d = data as { sessionId: string; peerId: string; peerName: string; peerImage: string | null };
        setPeerName(d.peerName);
        setPeerImage(d.peerImage);
        setPeerId(d.peerId);
        setSessionId(d.sessionId);
        setLastPeer(null);
        setCallDuration(0);
        setChatMessages([]);
        // Create WebRTC offer for the new match
        webrtc.createOffer().then((offer) => {
          emit("signal", { type: "offer", sessionId: d.sessionId, data: offer });
        }).catch((err) => console.error("[WebRTC] Failed to create offer:", err));
        // Push notification (fires only if tab not focused)
        if (document.hidden) {
          showNotification(t("push.matchFound"), { body: t("push.matchFoundBody"), tag: "match" });
        }
      }),
      on("partner-signal", async (data: unknown) => {
        const d = data as { type: "offer" | "answer" | "ice-candidate"; data: RTCSessionDescriptionInit | RTCIceCandidateInit };
        try {
          if (d.type === "offer") {
            const answer = await webrtc.createAnswer(d.data as RTCSessionDescriptionInit);
            emit("signal", { type: "answer", sessionId: sessionIdRef.current, data: answer });
          } else if (d.type === "answer") {
            await webrtc.setRemoteAnswer(d.data as RTCSessionDescriptionInit);
          } else if (d.type === "ice-candidate") {
            await webrtc.addIceCandidate(d.data as RTCIceCandidateInit);
          }
        } catch (err) {
          console.error("[WebRTC] Signal handling error:", err);
        }
      }),
      on("chat-message", (data: unknown) => {
        const d = data as { senderId: string; message: string };
        const msg: ChatMessage = {
          id: Date.now().toString(),
          senderId: d.senderId,
          message: d.message,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, msg]);
      }),
      on("chat-count-update", (data: unknown) => {
        const d = data as { used: number; limit: number };
        setChatUsed(d.used);
        setChatLimit(d.limit);
      }),
      on("chat-limit-reached", (data: unknown) => {
        const d = data as { plan: SubscriptionPlan };
        setChatBlocked(true);
        setCurrentPlan(d.plan);
      }),
      on("message-blocked", (data: unknown) => {
        const d = data as { reason: string; categories: string[]; violationCount: number };
        const systemMsg: ChatMessage = {
          id: `blocked-${Date.now()}`,
          senderId: "system",
          message: d.reason === "too_many_violations"
            ? t("chat.tooManyViolations")
            : t("chat.messageBlocked"),
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, systemMsg]);
      }),
      on("rapid-skip-warning", (data: unknown) => {
        const d = data as { skipsLeft: number };
        setSkipWarning(d.skipsLeft);
        if (skipWarningTimer.current) clearTimeout(skipWarningTimer.current);
        skipWarningTimer.current = setTimeout(() => setSkipWarning(null), 5000);
      }),
      on("partner-disconnected", () => {
        // Use refs to avoid stale closure
        const name = peerNameRef.current;
        const id = peerIdRef.current;
        const sid = sessionIdRef.current;
        if (name && id && sid) {
          setLastPeer({ name, id, sessionId: sid });
          setRatingPeer({ name, id, sessionId: sid });
          setShowRating(true);
        }
        setPeerBadge(null);
        setPeerName("");
        setPeerImage(null);
        setRemoteStream(null);
        setIsConnectedToPeer(false);
        setCallDuration(0);
        webrtc.cleanup();
      }),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
      if (skipWarningTimer.current) clearTimeout(skipWarningTimer.current);
    };
  }, [on, emit, webrtc, t, showNotification]);

  useEffect(() => {
    if (isConnectedToPeer) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnectedToPeer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleCamera = () => {
    const enabled = webrtc.toggleCamera();
    setIsCameraOn(enabled);
  };

  const handleToggleMic = () => {
    const enabled = webrtc.toggleMic();
    setIsMicOn(enabled);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await webrtc.stopScreenShare();
      setIsScreenSharing(false);
      setLocalStream(webrtc.localStream.current);
    } else {
      const screen = await webrtc.startScreenShare();
      if (screen) {
        setIsScreenSharing(true);
        setLocalStream(screen);
        // Когда пользователь остановит через браузер
        screen.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setLocalStream(webrtc.localStream.current);
        };
      }
    }
  };

  const handleNext = () => {
    if (sessionId) {
      emit("end-chat", sessionId);
    }
    webrtc.cleanup();
    setRemoteStream(null);
    setCallDuration(0);
    setChatMessages([]);
    setIsConnectedToPeer(false);

    const subcategorySlugs = subsParam ? subsParam.split(",").filter(Boolean) : [];
    const tags = tagsParam ? decodeURIComponent(tagsParam).split(",").filter(Boolean) : [];

    emit("next-partner", {
      userId: (session?.user as { id?: string })?.id || "anon",
      userName: session?.user?.name || "User",
      userImage: session?.user?.image || null,
      categorySlug,
      subcategorySlugs,
      tags,
    });
  };

  const handleEndCall = () => {
    if (sessionId) {
      emit("end-chat", sessionId);
    }
    webrtc.cleanup();
    router.push("/lobby");
  };

  const handleReport = useCallback((data: { reason: string; description: string }) => {
    const reportPeerId = peerId || lastPeer?.id;
    const reportPeerName = peerName || lastPeer?.name;
    const reportSessionId = sessionId || lastPeer?.sessionId;
    const reporterId = (session?.user as { id?: string })?.id;
    if (!reportPeerId || !reporterId) return;

    fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporterId,
        reportedId: reportPeerId,
        reportedName: reportPeerName,
        reason: data.reason,
        description: data.description,
        sessionId: reportSessionId,
      }),
    }).catch(() => { /* silent fail */ });
  }, [peerId, peerName, sessionId, lastPeer, session]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !sessionId) return;

    const message = messageInput.trim();
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: session?.user?.name || t("chat.you"),
      message,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    emit("send-message", { sessionId, message });
    setMessageInput("");
  };

  const categoryName = category ? t(`categories.${category.slug}`) : "";

  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndCall}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{category?.icon}</span>
            <span className="text-sm font-medium text-white">{categoryName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Peer info */}
          {peerName && peerBadge && (
            <PeerInfo name={peerName} image={peerImage} badge={peerBadge} compact />
          )}

          {/* Chat limit mini-indicator */}
          <ChatLimitBanner used={chatUsed} limit={chatLimit} plan={currentPlan} />

          {/* My badge */}
          <TrustBadge badge={myBadge} size="sm" showLabel={false} />

          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isConnectedToPeer ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"}`} />
            <span className="text-sm text-gray-300 font-mono">
              {formatTime(callDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative flex">
        {/* Main video (remote) */}
        <div className="flex-1 relative">
          <VideoPlayer
            stream={remoteStream}
            className="w-full h-full"
            label={isConnectedToPeer ? t("chat.partner") : undefined}
          />

          {/* Skip warning toast */}
          {skipWarning !== null && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-black px-4 py-2 rounded-xl text-sm font-medium shadow-lg animate-pulse">
              {t("trust.rapidSkipWarning", { skipsLeft: skipWarning })}
            </div>
          )}

          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">
                  {t("chat.searching")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("chat.categoryLabel")}: {category?.icon} {categoryName}
                </p>
              </div>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
              {t("chat.cameraError")}
            </div>
          )}

          {/* Local video (PiP) */}
          <div className={`absolute bottom-4 right-4 rounded-xl overflow-hidden shadow-2xl ${
            isScreenSharing ? "w-48 h-36 border-2 border-indigo-500" : "w-48 h-36 border-2 border-gray-700"
          }`}>
            <VideoPlayer
              stream={localStream}
              muted={true}
              mirrored={!isScreenSharing}
              className="w-full h-full"
              label={isScreenSharing ? t("chat.screenShare") : t("chat.you")}
            />
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{t("chat.textChat")}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-gray-600 text-center mt-8">
                  {t("chat.noMessages")}
                </p>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-indigo-400 mb-1">{msg.senderId}</p>
                  <p className="text-sm text-gray-200">{msg.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={t("chat.messagePlaceholder")}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="h-20 bg-gray-900/80 backdrop-blur-xl border-t border-gray-800 flex items-center justify-center gap-4 px-6">
        <IconButton
          active={isMicOn}
          onClick={handleToggleMic}
          label={isMicOn ? t("chat.mic") : t("chat.micOff")}
          icon={
            isMicOn ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )
          }
        />

        <IconButton
          active={isCameraOn}
          onClick={handleToggleCamera}
          label={isCameraOn ? t("chat.camera") : t("chat.cameraOff")}
          icon={
            isCameraOn ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )
          }
        />

        <IconButton
          active={showChat}
          onClick={() => setShowChat(!showChat)}
          label={t("chat.textChat")}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />

        {/* Screen Share button */}
        <IconButton
          active={isScreenSharing}
          onClick={handleToggleScreenShare}
          label={isScreenSharing ? t("chat.stopShare") : t("chat.screenShare")}
          icon={
            isScreenSharing ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )
          }
        />

        {/* Report button — visible when connected or after peer left */}
        {(peerName || lastPeer) && (
          <IconButton
            onClick={() => setShowReport(true)}
            label={t("report.title")}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" />
              </svg>
            }
          />
        )}

        <IconButton
          onClick={handleNext}
          variant="primary"
          label={t("chat.nextPartner")}
          size="lg"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          }
        />

        <IconButton
          onClick={handleEndCall}
          variant="danger"
          label={t("chat.endCall")}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          }
        />
      </div>

      {/* Chat limit blocked overlay */}
      {chatBlocked && (
        <ChatLimitBanner
          used={chatUsed}
          limit={chatLimit}
          plan={currentPlan}
          blocked
          onUpgrade={() => router.push("/lobby")}
        />
      )}

      {/* Report modal */}
      {showReport && (
        <ReportModal
          peerName={peerName || lastPeer?.name || ""}
          peerId={peerId || lastPeer?.id || ""}
          sessionId={sessionId || lastPeer?.sessionId || ""}
          onSubmit={handleReport}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Rating modal */}
      {showRating && ratingPeer && (
        <RatingModal
          peerName={ratingPeer.name}
          peerId={ratingPeer.id}
          sessionId={ratingPeer.sessionId}
          onSubmit={() => {
            setShowRating(false);
            setRatingPeer(null);
          }}
          onSkip={() => {
            setShowRating(false);
            setRatingPeer(null);
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-950">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
