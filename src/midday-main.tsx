import React from 'react';
import ReactDOM from 'react-dom/client';
import { middayCheckinData } from './mockData';
import MiddayCheckin from './midday/MiddayCheckin';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MiddayCheckin
      data={middayCheckinData}
      onSave={(result) => {
        document.body.dataset.savedPayload = JSON.stringify(result);
      }}
    />
  </React.StrictMode>,
);
