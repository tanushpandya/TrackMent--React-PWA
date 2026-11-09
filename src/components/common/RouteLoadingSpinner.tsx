import React from 'react';

export const RouteLoadingSpinner: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '45vh',
      width: '100%',
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        border: '3.5px solid #E2E8F0',
        borderTopColor: '#2563EB',
        borderRadius: '50%',
        animation: 'spin 0.65s linear infinite',
      }}
    />
  </div>
);
