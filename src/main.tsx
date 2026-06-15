import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { writeStartupLog } from './lib/electron-api';
import './index.css';

const rendererEntryStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
const rootElement = document.getElementById('root');

writeStartupLog('renderer entry loaded', {
  durationMs: 0,
  hasRootElement: Boolean(rootElement),
});

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  writeStartupLog('react root render requested', {
    durationMs: Math.round(Math.max(0, now - rendererEntryStartedAt)),
  });
}
