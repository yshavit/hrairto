import React from 'react';
import ReactDOM from 'react-dom/client';
import { weeklySessionData } from './mockData';
import WeeklyPlanning from './weekly/WeeklyPlanning';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WeeklyPlanning data={weeklySessionData} />
  </React.StrictMode>,
);
