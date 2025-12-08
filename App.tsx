import React, { useState } from 'react';
import Home from './components/Home';
import SessionResult from './components/SessionResult';
import { SessionData } from './types';

type ViewState = 'home' | 'result';

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);

  const handleSessionGenerated = (data: SessionData) => {
    setCurrentSession(data);
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
        <SessionResult 
          data={currentSession} 
          formatId="minedu" 
          onBack={handleBack} 
        />
      )}
    </>
  );
}

export default App;