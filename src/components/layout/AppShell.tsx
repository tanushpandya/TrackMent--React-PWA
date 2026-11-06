import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileTabs } from './MobileTabs';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      {/* Ambient background glow orbs */}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 800 ? '258px minmax(0, 1fr)' : '1fr',
        }}
        className="app-shell-container"
      >
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          <main
            style={{
              maxWidth: 1190,
              width: '100%',
              margin: '0 auto',
              padding: '30px clamp(16px, 4vw, 56px) 90px',
              flex: 1,
            }}
          >
            <Outlet />
          </main>

          <MobileTabs />
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .app-shell-container {
            display: block !important;
          }
          aside {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            box-shadow: 18px 0 45px rgba(15, 57, 89, 0.25) !important;
          }
          .mobile-only {
            display: flex !important;
          }
        }
        @media (min-width: 801px) {
          .mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
