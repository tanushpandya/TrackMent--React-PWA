import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileTabs } from './MobileTabs';
import { RouteLoadingSpinner } from '../common/RouteLoadingSpinner';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      {/* Ambient background glow orbs */}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <div className="app-shell-grid">
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          <main className="app-shell-main">
            <Suspense fallback={<RouteLoadingSpinner />}>
              <Outlet />
            </Suspense>
          </main>

          <MobileTabs />
        </div>
      </div>

      <style>{`
        .app-shell-grid {
          display: grid;
          grid-template-columns: 258px minmax(0, 1fr);
          min-height: 100vh;
        }
        .app-shell-main {
          max-width: 1190px;
          width: 100%;
          margin: 0 auto;
          padding: 28px clamp(16px, 4vw, 56px) 90px;
          flex: 1;
        }
        @media (max-width: 800px) {
          .app-shell-grid {
            display: block !important;
          }
          .app-shell-main {
            padding: 16px 12px 86px !important;
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
