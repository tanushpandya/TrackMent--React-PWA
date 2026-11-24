import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  note?: string;
  subtitle?: string;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  onClick?: () => void;
  iconBg?: string;
  iconColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  note,
  subtitle,
  subtext,
  icon,
  badge,
  actionText,
  onAction,
  onClick,
  iconBg = 'bg-[#EFF6FF] border-[#BFDBFE]',
  iconColor = 'text-[#1D63ED]',
}) => {
  const caption = note ?? subtitle ?? subtext;

  return (
    <div
      onClick={onClick}
      className={`surface-card p-5 flex flex-col justify-between gap-3 transition-all ${
        onClick ? 'cursor-pointer hover:border-[#1D63ED]/60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2.5 flex-wrap">
            <span className="text-3xl font-bold text-[#0A2540] font-mono tabular-nums leading-none">
              {value}
            </span>
            {badge && <div>{badge}</div>}
          </div>
        </div>
        {icon && (
          <div
            className={`w-9 h-9 rounded-lg border ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
          >
            {icon}
          </div>
        )}
      </div>

      {(caption || actionText) && (
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
          <span className="text-slate-500 truncate">{caption}</span>
          {actionText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAction) onAction();
              }}
              className="font-semibold text-[#1D63ED] hover:underline shrink-0"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
