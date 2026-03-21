"use client";

import type { TrustBadge as TrustBadgeType } from "@/types";
import TrustBadge from "./TrustBadge";

function sanitizeImageUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch { /* invalid URL */ }
  return null;
}

interface PeerInfoProps {
  name: string;
  image: string | null;
  badge: TrustBadgeType;
  compact?: boolean;
}

export default function PeerInfo({ name, image, badge, compact = false }: PeerInfoProps) {
  const safeImage = sanitizeImageUrl(image);
  const initial = name.charAt(0).toUpperCase();
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {safeImage ? (
          <img src={safeImage} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300">
            {initial}
          </div>
        )}
        <span className="text-sm font-medium text-white truncate max-w-24">{name}</span>
        <TrustBadge badge={badge} size="sm" showLabel={false} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-gray-700/50">
      {safeImage ? (
        <img src={safeImage} alt="" className="w-9 h-9 rounded-full ring-2 ring-gray-600" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
          {initial}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white leading-tight">{name}</span>
        <TrustBadge badge={badge} size="sm" />
      </div>
    </div>
  );
}
