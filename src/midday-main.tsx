import React from 'react';
import ReactDOM from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { middayCheckinData } from './mockData';
import MiddayCheckin from './midday/MiddayCheckin';

async function onReady() {
  if (!('__TAURI_INTERNALS__' in window)) return;
  const el = document.querySelector('.midday-checkin') as HTMLElement;
  await invoke('show_midday', { height: el.offsetHeight });
  new ResizeObserver(() => {
    void invoke('resize_midday', { height: el.offsetHeight });
  }).observe(el);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MiddayCheckin
      data={middayCheckinData}
      onSave={(result) => {
        document.body.dataset.savedPayload = JSON.stringify(result);
      }}
      onReady={() => {
        void onReady();
      }}
    />
  </React.StrictMode>,
);
