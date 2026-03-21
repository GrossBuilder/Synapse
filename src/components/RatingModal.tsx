"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface RatingModalProps {
  peerName: string;
  peerId: string;
  sessionId: string;
  onSubmit: (rating: number) => void;
  onSkip: () => void;
}

export default function RatingModal({
  peerName,
  peerId,
  sessionId,
  onSubmit,
  onSkip,
}: RatingModalProps) {
  const t = useTranslations("chat");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;

    fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerId, sessionId, score: rating }),
    }).catch(() => {});

    setSubmitted(true);
    setTimeout(() => onSubmit(rating), 1500);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in duration-300">
          <div className="text-5xl mb-3">✨</div>
          <p className="text-lg font-medium text-white">{t("rateThanks")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-in fade-in zoom-in duration-300">
        <h3 className="text-lg font-semibold text-white mb-1">
          {t("ratePartner")}
        </h3>
        <p className="text-sm text-gray-400 mb-6">{peerName}</p>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <svg
                className={`w-10 h-10 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-600"
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          >
            {t("rateSkip")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              rating > 0
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            {t("rateSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}
