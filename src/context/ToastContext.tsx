import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              border: '1px solid #c9e3eb',
              background: 'rgba(255, 255, 255, 0.96)',
              boxShadow: '0 16px 40px rgba(35, 90, 120, 0.18)',
              color: toast.type === 'error' ? '#B34F5C' : '#102F48',
              fontSize: 13,
              fontWeight: 750,
              backdropFilter: 'blur(10px)',
              animation: 'pageIn 0.25s ease both',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : '✦'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
