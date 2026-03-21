"use client";

import type { SubscriptionPlan } from "@/types";

interface SubscriptionBadgeProps {
  plan: SubscriptionPlan;
}

const PLAN_STYLES: Record<SubscriptionPlan, {
  label: string;
  bg: string;
  text: string;
  icon: string;
}> = {
  free: {
    label: "Free",
    bg: "bg-gray-700/50",
    text: "text-gray-400",
    icon: "",
  },
  plus: {
    label: "Plus",
    bg: "bg-gradient-to-r from-indigo-600/20 to-purple-600/20",
    text: "text-indigo-300",
    icon: "⚡",
  },
  pro: {
    label: "Pro",
    bg: "bg-gradient-to-r from-amber-600/20 to-orange-600/20",
    text: "text-amber-300",
    icon: "★",
  },
};

export default function SubscriptionBadge({ plan }: SubscriptionBadgeProps) {
  // Не показываем для Free — не засоряем UI
  if (plan === "free") return null;

  const style = PLAN_STYLES[plan];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span>{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
