import React, { useState } from 'react';

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
  subtitle,
  actionText,
  onAction,
  mentorName,
}) => {
  const [cheered, setCheered] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const mentorLabel = mentorName ? `${mentorName}'s` : 'your mentor\'s';

  const quotes = [
    {
      headline: `Your team is on track for ${mentorLabel} next review`,
      sub: 'All milestones aligned. Keep pushing forward together.',
    },
    {
      headline: 'Strong sprint momentum — keep your artifacts documented',
      sub: 'Up-to-date test coverage and architecture notes streamline evaluations.',
    },
    {
      headline: 'Consistent contributions build a stronger CIE evaluation',
      sub: 'Keep your proof-of-work log updated ahead of your upcoming consultation.',
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
    : defaultMessage || 'Stay on top of your upcoming project milestones.';
  const subline = cheered
    ? currentQuote.sub
    : subtitle || 'Your project companion tracks progress and upcoming reviews.';

  return (
    <div
      className={`surface-card p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all mb-5 ${
        cheered
          ? 'bg-gradient-to-r from-white via-[#EFF6FF]/75 to-[#ECFDF5]/65'
          : 'bg-gradient-to-r from-white to-[#EFF6FF]/70'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Isolated semantic button for the Companion Orb */}
        <button
          type="button"
          onClick={handleOrbClick}
          aria-label={cheered ? 'Cycle companion tip' : 'View companion tip'}
          title={cheered ? 'Click to cycle tip' : 'Click for a project tip'}
          className={`w-12 h-12 shrink-0 rounded-full orb-float focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63ED] ${
            cheered ? 'orb-cheered-ring' : ''
          }`}
        >
          {cheered ? (
            <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-sm" aria-hidden="true">
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
            </svg>
          ) : (
            <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-sm" aria-hidden="true">
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
        </button>

        <div className="min-w-0">
          <div className="text-[14px] font-bold text-[#0A2540]">
            {headline}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {subline}
          </p>
        </div>
      </div>

      {actionText && (
        <div className="flex items-center gap-2 shrink-0">
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
