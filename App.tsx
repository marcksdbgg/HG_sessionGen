import React, { useState } from 'react';
import Home from './components/Home';
import SessionResult from './components/SessionResult';
import { SessionData } from './types';

type ViewState = 'home' | 'result';

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [currentFormat, setCurrentFormat] = useState<string>('minedu');

  const handleSessionGenerated = (data: SessionData, formatId: string) => {
    setCurrentSession(data);
    setCurrentFormat(formatId);
    setView('result');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setView('home');
  };

  return (
    <>
      {view === 'home' && <Home onSessionGenerated={handleSessionGenerated} />}
      {view === 'result' && currentSession && (
        <SessionResult data={currentSession} formatId={currentFormat} onBack={handleBack} />
      )}
    </>
  );
}

export default App;