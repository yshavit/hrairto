import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './index.css';
import TrayPopup from './tray/TrayPopup';
import YearlyGoals from './goals/YearlyGoals';
import WeeklyPlanning from './weekly/WeeklyPlanning';
import { weeklySessionData } from './mockData';

// Catch errors that prevent React from mounting at all (module-load failures,
// synchronous throws during evaluation). Shows error text in the window so we
// don't have to open DevTools to diagnose a blank white screen.
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<pre style="color:#ff6b6b;background:#111;padding:20px;margin:0;height:100vh;font:12px monospace;white-space:pre-wrap;overflow:auto">${e.message}\n\n${e.error?.stack ?? ''}</pre>`;
  }
});

const label = getCurrentWindow().label;
const Root =
  label === 'goals'
    ? YearlyGoals
    : label === 'weekly'
      ? () => <WeeklyPlanning data={weeklySessionData} onSave={(req) => console.log('plan saved', req)} />
      : TrayPopup;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
