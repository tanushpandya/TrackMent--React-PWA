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
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ maxWidth: 640 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '1.55px',
            textTransform: 'uppercase',
            color: '#267B9B',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            fontSize: 'clamp(24px, 3.2vw, 34px)',
            fontWeight: 850,
            letterSpacing: '-1.1px',
            color: '#102F48',
            lineHeight: 1.15,
            margin: '0 0 8px 0',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: '#5E788C',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
