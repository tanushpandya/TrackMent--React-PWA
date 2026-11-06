import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 520,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(10, 47, 72, 0.45)',
        backdropFilter: 'blur(8px)',
        animation: 'pageIn 0.2s ease both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #ffffff, #f4fafb)',
          borderRadius: 22,
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 24px 60px rgba(10, 48, 77, 0.28)',
          overflow: 'hidden',
          animation: 'pageIn 0.25s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        }}
      >
        {/* Modal Top Bar Accent */}
        <div
          style={{
            height: 4,
            background: 'linear-gradient(90deg, #07518d 0%, #087aa9 38%, #28bdca 72%, rgba(40, 189, 202, 0) 100%)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '18px 22px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid #D5E8EF',
          }}
        >
          <div>
            <h3
              id="modal-title"
              style={{
                fontSize: 17,
                fontWeight: 850,
                color: '#102F48',
                margin: 0,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  fontSize: 12,
                  color: '#5E788C',
                  marginTop: 3,
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid #D5E8EF',
              background: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              color: '#5E788C',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
