import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export interface MascotCompanionBannerProps {
  defaultMessage?: string;
  defaultMood?: string;
  isLead?: boolean;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  mentorName?: string;
}

export const MascotCompanionBanner: React.FC<MascotCompanionBannerProps> = ({
  defaultMessage,
  defaultMood,
  isLead,
  subtitle,
  actionText,
  onAction,
  mentorName = 'Prof. Dr. Badarinath K B',
}) => {
  const [cheered, setCheered] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const quotes = [
    {
      headline: `Companion energized! Your team is ready for ${mentorName}’s review 🚀`,
      sub: 'All milestones aligned. Keep pushing forward together!',
    },
    {
      headline: 'Excellent sprint momentum! Phase 2 artifacts verified ✨',
      sub: 'Your test coverage and architecture docs look crisp and compliant.',
    },
    {
      headline: 'Great teamwork detected! Consistency leads to 40/40 CIE 🎯',
      sub: 'Your proof-of-work log is up to date for your upcoming consultation.',
    },
  ];

  const handleOrbClick = () => {
    if (!cheered) {
      setCheered(true);
      setQuoteIdx(0);
    } else {
      const next = quoteIdx + 1;
      if (next < quotes.length) {
        setQuoteIdx(next);
      } else {
        setCheered(false);
      }
    }
  };

  const currentQuote = quotes[quoteIdx % quotes.length];
  const headline = cheered
    ? currentQuote.headline
    : defaultMessage || `Your mentor requested a meeting: "Phase 2 Architecture & Demo"`;
  const subline = cheered
    ? currentQuote.sub
    : subtitle || 'Your friendly project companion is cheering you on.';

  return (
    <div
      onClick={handleOrbClick}
      className={`surface-card p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all hover:border-[#1D63ED]/50 mb-5 ${
        cheered
          ? 'bg-gradient-to-r from-white via-[#EFF6FF]/75 to-[#ECFDF5]/65'
          : 'bg-gradient-to-r from-white to-[#EFF6FF]/70'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Animated Friendly Blue Companion Orb */}
        <div
          className={`w-12 h-12 shrink-0 orb-float ${cheered ? 'orb-cheered-ring' : ''}`}
          title="Tap to cheer me up!"
        >
          {cheered ? (
            <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-sm">
              <defs>
                <radialGradient id="orbHappy" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#7DD3FC" />
                  <stop offset="55%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#0A2540" />
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="url(#orbHappy)" />
              <ellipse
                cx="23"
                cy="18"
                rx="8"
                ry="4"
                transform="rotate(-22 23 18)"
                fill="rgba(255,255,255,0.45)"
              />
              <path
                d="M20 29 Q23 24 26 29"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M38 29 Q41 24 44 29"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="19" cy="35" r="3" fill="rgba(251,113,133,0.55)" />
              <circle cx="45" cy="35" r="3" fill="rgba(251,113,133,0.55)" />
              <path
                d="M25 37 Q32 44 39 37"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M53 11 L54.5 14.5 L58 16 L54.5 17.5 L53 21 L51.5 17.5 L48 16 L51.5 14.5 Z"
                fill="#FBBF24"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-sm">
              <defs>
                <radialGradient id="orbBlue" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="55%" stopColor="#1D4ED8" />
                  <stop offset="100%" stopColor="#0A2540" />
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="url(#orbBlue)" />
              <ellipse
                cx="23"
                cy="18"
                rx="8"
                ry="4"
                transform="rotate(-22 23 18)"
                fill="rgba(255,255,255,0.42)"
              />
              <path
                d="M18 24 L25 22"
                stroke="#DBEAFE"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M46 24 L39 22"
                stroke="#DBEAFE"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="23" cy="30" r="3.2" fill="#0A2540" />
              <circle cx="22" cy="29" r="1.1" fill="#FFFFFF" />
              <circle cx="41" cy="30" r="3.2" fill="#0A2540" />
              <circle cx="40" cy="29" r="1.1" fill="#FFFFFF" />
              <path
                d="M26 41 Q32 37 38 41"
                stroke="#DBEAFE"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}
        </div>

        <div>
          <div className="text-[14px] font-bold text-[#0A2540]">
            {headline}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {subline}
            <span className="font-semibold text-[#1D63ED] ml-1">
              {cheered ? 'Cheered up! (Tap to cycle)' : 'Tap to cheer me up ✨'}
            </span>
          </p>
        </div>
      </div>

      {actionText && (
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onAction}
            className="h-9 px-3.5 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};
