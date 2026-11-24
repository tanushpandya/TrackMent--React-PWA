import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface AppCardProps {
  title?: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  accent?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const AppCard: React.FC<AppCardProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  accent = false,
  children,
  style,
}) => {
  return (
    <div
      style={style}
      className={`surface-card relative overflow-hidden p-5 mb-4 ${accent ? 'card-top-accent' : ''}`}
    >
      {(title || actionText) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-bold text-[#0A2540] leading-snug">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {actionText && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D63ED] hover:underline whitespace-nowrap shrink-0"
            >
              <span>{actionText}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
