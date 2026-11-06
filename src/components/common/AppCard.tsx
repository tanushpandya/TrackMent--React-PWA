import React from 'react';

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
  accent = true,
  children,
  style,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.96)',
        borderRadius: 19,
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(244, 250, 251, 0.85))',
        boxShadow: '0 18px 42px rgba(12, 64, 101, 0.15)',
        backdropFilter: 'blur(12px)',
        padding: 22,
        marginBottom: 18,
        ...style,
      }}
    >
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #07518d 0%, #087aa9 38%, #28bdca 72%, rgba(40, 189, 202, 0) 100%)',
          }}
        />
      )}

      {(title || actionText) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 850,
                  color: '#102F48',
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 12,
                  color: '#70899A',
                  marginTop: 4,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {actionText && (
            <button
              onClick={onAction}
              style={{
                background: 'none',
                border: 'none',
                color: '#257DA0',
                fontSize: 11.5,
                fontWeight: 850,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {actionText} ↗
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
