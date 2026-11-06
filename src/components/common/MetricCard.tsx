import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  note?: string;
  subtitle?: string;
  subtext?: string;
  variant?: 1 | 2 | 3 | 4;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const gradientVariants = {
  1: 'linear-gradient(90deg, #2676ac, #48c4cf, rgba(90, 190, 194, 0))',
  2: 'linear-gradient(90deg, #44a99e, #a0dcca, rgba(160, 220, 202, 0))',
  3: 'linear-gradient(90deg, #4f8ac2, #a7d1ec, rgba(167, 209, 236, 0))',
  4: 'linear-gradient(90deg, #c19456, #f0cf91, rgba(240, 207, 145, 0))',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  note,
  subtitle,
  subtext,
  variant = 1,
  color,
  icon,
  onClick,
}) => {
  const displayNote = note || subtitle || subtext;

  return (
    <article
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.96)',
        borderRadius: 19,
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(244, 250, 251, 0.82))',
        boxShadow: '0 18px 42px rgba(12, 64, 101, 0.14)',
        backdropFilter: 'blur(11px)',
        padding: '18px 20px',
        animation: 'pageIn 0.35s ease both',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3.5,
          background: color || gradientVariants[variant],
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.9px',
            fontWeight: 850,
            color: '#738C9C',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        {icon && <div style={{ color: color || '#2676ac', opacity: 0.85 }}>{icon}</div>}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 27,
          letterSpacing: '-1px',
          fontWeight: 900,
          color: color || '#154E79',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {displayNote && (
        <div
          style={{
            marginTop: 5,
            fontSize: 11,
            fontWeight: 650,
            color: '#5D988D',
          }}
        >
          {displayNote}
        </div>
      )}
    </article>
  );
};
