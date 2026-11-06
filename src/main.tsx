import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/global.css';

// Register PWA service worker smoothly without jarring page reloads
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[TrackMent PWA] Service worker update available.');
  },
  onOfflineReady() {
    console.log('[TrackMent PWA] App ready to work offline.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
