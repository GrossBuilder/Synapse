"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import { IconButton, Button } from "@/components/ui";
import { useGroupWebRTC } from "@/hooks/useGroupWebRTC";
import { useSocket } from "@/hooks/useSocket";

interface GroupParticipantInfo {
  userId: string;
  userName: string;
  userImage: string | null;
  socketId: string;
}

function GroupRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const t = useTranslations();
  const { emit, on, isConnected } = useSocket();

  const roomId = searchParams.get("room");
  const action = searchParams.get("action") || "join"; // "create" or "join"
  const categorySlug = searchParams.get("category") || "tech";
  const roomName = searchParams.get("name") || "Group Room";

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<GroupParticipantInfo[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(roomId);
  const [currentRoomName, setCurrentRoomName] = useState(roomName);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string; time: number }>>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const groupRTC = useGroupWebRTC({
    onPeerStream: () => { /* streams updated through peerStreams state */ },
    onPeerDisconnected: (socketId) => {
      groupRTC.removePeer(socketId);
    },
    onIceCandidate: (targetSocketId, candidate) => {
      if (currentRoomId) {
        emit("group-signal", {
          roomId: currentRoomId,
          targetSocketId,
          type: "ice-candidate",
          data: candidate,
        });
      }
    },
  });

  // Инициализируем камеру
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await groupRTC.getLocalStream();
        setLocalStream(stream);
      } catch {
        console.error("Camera access denied");
      }
    };
    init();
    return () => { groupRTC.cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Создание/присоединение при подключении сокета
  useEffect(() => {
    if (!isConnected || !session?.user) return;

    const userId = (session.user as { id?: string }).id || session.user.name || "anon";
    const userName = session.user.name || "User";
    const userImage = session.user.image || null;

    if (action === "create") {
      emit("create-group-room", {
        userId,
        userName,
        userImage,
        roomName,
        categorySlug,
        maxParticipants: 6,
        isPublic: true,
      });
    } else if (roomId) {
      emit("join-group-room", { userId, userName, userImage, roomId });
    }
  }, [isConnected, session, action, roomId, roomName, categorySlug, emit]);

  // Socket listeners
  useEffect(() => {
    const unsubs = [
      on("group-room-created", (data: unknown) => {
        const d = data as { roomId: string; name: string; participants: GroupParticipantInfo[] };
        setCurrentRoomId(d.roomId);
        setCurrentRoomName(d.name);
        setParticipants(d.participants);
      }),

      on("group-room-joined", async (data: unknown) => {
        const d = data as { roomId: string; name: string; participants: GroupParticipantInfo[] };
        setCurrentRoomId(d.roomId);
        setCurrentRoomName(d.name);
        setParticipants(d.participants);

        // Создаём offer для каждого существующего участника
        for (const p of d.participants) {
          const offer = await groupRTC.createOffer(p.socketId, p.userId, p.userName, p.userImage);
          emit("group-signal", {
            roomId: d.roomId,
            targetSocketId: p.socketId,
            type: "offer",
            data: offer,
          });
        }
      }),

      on("group-participant-joined", async (data: unknown) => {
        const d = data as GroupParticipantInfo;
        setParticipants((prev) => [...prev, d]);
        // Новый участник отправит нам offer — ждём его
      }),

      on("group-participant-left", (data: unknown) => {
        const d = data as { userId: string; socketId: string };
        groupRTC.removePeer(d.socketId);
        setParticipants((prev) => prev.filter((p) => p.socketId !== d.socketId));
      }),

      on("group-host-changed", (data: unknown) => {
        const d = data as { userId: string; userName: string };
        console.log(`New host: ${d.userName}`);
      }),

      on("group-peer-signal", async (data: unknown) => {
        const d = data as {
          roomId: string;
          senderSocketId: string;
          type: "offer" | "answer" | "ice-candidate";
          data: unknown;
        };

        if (d.type === "offer") {
          // Находим инфо о пире
          const peerInfo = participants.find((p) => p.socketId === d.senderSocketId);
          const answer = await groupRTC.createAnswer(
            d.senderSocketId,
            peerInfo?.userId || "unknown",
            peerInfo?.userName || "User",
            peerInfo?.userImage || null,
            d.data as RTCSessionDescriptionInit,
          );
          emit("group-signal", {
            roomId: d.roomId,
            targetSocketId: d.senderSocketId,
            type: "answer",
            data: answer,
          });
        } else if (d.type === "answer") {
          await groupRTC.setRemoteAnswer(d.senderSocketId, d.data as RTCSessionDescriptionInit);
        } else if (d.type === "ice-candidate") {
          await groupRTC.addIceCandidate(d.senderSocketId, d.data as RTCIceCandidateInit);
        }
      }),

      on("group-chat-message", (data: unknown) => {
        const d = data as { senderName: string; message: string };
        setChatMessages((prev) => [...prev, { sender: d.senderName, message: d.message, time: Date.now() }]);
      }),

      on("group-room-error", (data: unknown) => {
        const d = data as { error: string };
        setError(d.error);
      }),
    ];

    return () => { unsubs.forEach((fn) => fn()); };
  }, [on, emit, participants]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeave = () => {
    if (currentRoomId) emit("leave-group-room", { roomId: currentRoomId });
    groupRTC.cleanup();
    router.push("/lobby");
  };

  const handleToggleCamera = () => {
    const enabled = groupRTC.toggleCamera();
    setIsCameraOn(enabled);
  };

  const handleToggleMic = () => {
    const enabled = groupRTC.toggleMic();
    setIsMicOn(enabled);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentRoomId) return;
    emit("group-message", { roomId: currentRoomId, message: messageInput.trim() });
    setChatMessages((prev) => [
      ...prev,
      { sender: session?.user?.name || "You", message: messageInput.trim(), time: Date.now() },
    ]);
    setMessageInput("");
  };

  const handleCopyLink = async () => {
    if (currentRoomId) {
      const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}&action=join`;
      await navigator.clipboard.writeText(url);
    }
  };

  // Видео-грид: рассчитываем лейаут
  const allStreams = Array.from(groupRTC.peerStreams.entries());
  const totalVideos = 1 + allStreams.length; // local + peers
  const gridCols = totalVideos <= 2 ? 2 : totalVideos <= 4 ? 2 : 3;

  if (error) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-12 px-6 max-w-lg mx-auto text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">{error}</h2>
          <p className="text-gray-400 mb-6">
            {error === "Pro plan required"
              ? t("group.proRequired")
              : t("group.errorGeneric")}
          </p>
          <Button variant="primary" onClick={() => router.push("/lobby")}>
            {t("group.backToLobby")}
          </Button>
        </main>
      </>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleLeave} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            <span className="text-sm font-medium text-white">{currentRoomName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {totalVideos}/{6} {t("group.participants")}
          </span>
          <button
            onClick={handleCopyLink}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("group.copyLink")}
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 relative flex">
        <div className={`flex-1 p-2 grid gap-2 ${
          gridCols === 2 ? "grid-cols-2" : "grid-cols-3"
        } auto-rows-fr`}>
          {/* Local video */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
            <VideoPlayer
              stream={localStream}
              muted={true}
              mirrored={true}
              className="w-full h-full"
              label={`${session?.user?.name || "You"} (${t("chat.you")})`}
            />
          </div>

          {/* Peer videos */}
          {allStreams.map(([socketId, { stream, userName }]) => (
            <div key={socketId} className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
              <VideoPlayer
                stream={stream}
                className="w-full h-full"
                label={userName}
              />
            </div>
          ))}

          {/* Empty placeholders */}
          {Array.from({ length: Math.max(0, 2 - allStreams.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-xl bg-gray-900/50 border border-gray-800/50 flex items-center justify-center"
            >
              <div className="text-center text-gray-600">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xs">{t("group.waitingParticipant")}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{t("group.groupChat")}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-gray-600 text-center mt-8">{t("chat.noMessages")}</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-indigo-400 mb-1">{msg.sender}</p>
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
                <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Controls */}
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
          label={t("group.groupChat")}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <IconButton
          onClick={handleLeave}
          variant="danger"
          label={t("group.leaveRoom")}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

export default function GroupRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-950">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <GroupRoomContent />
    </Suspense>
  );
}
