"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
}

export default function VideoPlayer({
  stream,
  muted = false,
  mirrored = false,
  className = "",
  label,
  placeholder,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-900 ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Label */}
      {label && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-white font-medium">{label}</span>
        </div>
      )}

      {/* No stream placeholder */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            </div>
            {placeholder && <p className="text-gray-500 text-sm">{placeholder}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
