import { invoke } from '@tauri-apps/api/core';

// macOS calls it "Quit"; Windows (and elsewhere) calls it "Exit".
const isMac = navigator.userAgent.includes('Mac');
const quitLabel = isMac ? 'Quit' : 'Exit';

function TrayPopup() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100vh',
        padding: '0 1rem',
      }}
    >
      <button onClick={() => void invoke('open_yearly_goals')}>Yearly Goals</button>
      <button onClick={() => void invoke('open_weekly_planning')}>Weekly Planning</button>
      <button onClick={() => void invoke('quit')}>{quitLabel}</button>
    </div>
  );
}

export default TrayPopup;
