"use client";

import type { TrustBadge as TrustBadgeType } from "@/types";

interface TrustBadgeProps {
  badge: TrustBadgeType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

const BADGE_CONFIG: Record<TrustBadgeType, {
  icon: string;
  color: string;
  bg: string;
  ring: string;
}> = {
  trusted: {
    icon: "✦",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
  },
  regular: {
    icon: "●",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    ring: "ring-gray-500/20",
  },
  low: {
    icon: "▼",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
  },
};

const SIZES = {
  sm: "text-xs px-1.5 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
  lg: "text-base px-3 py-1.5 gap-2",
};

export default function TrustBadge({ badge, size = "md", showLabel = true, label }: TrustBadgeProps) {
  const config = BADGE_CONFIG[badge];

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium ring-1
        ${config.bg} ${config.color} ${config.ring} ${SIZES[size]}
      `}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{label || badge}</span>}
    </span>
  );
}
