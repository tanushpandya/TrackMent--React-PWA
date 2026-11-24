import React from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
      <div className="max-w-2xl">
        <div className="text-[10.5px] font-bold tracking-wider uppercase text-[#1D63ED] mb-1">
          {eyebrow}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540] leading-tight mb-1">
          {title}
        </h1>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
