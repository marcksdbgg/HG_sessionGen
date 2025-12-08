import React, { useState } from 'react';
import Home from './components/Home';
import SessionResult from './components/SessionResult';
import ResourcesPresenter from './components/ResourcesPresenter';
import { SessionData } from './types';

type ViewState = 'home' | 'result' | 'resources';

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

  const handleViewResources = () => {
    setView('resources');
    window.scrollTo(0, 0);
  };

  const handleBackToResult = () => {
    setView('result');
    window.scrollTo(0, 0);
  };

  return (
    <>
      {view === 'home' && <Home onSessionGenerated={handleSessionGenerated} />}
      {view === 'result' && currentSession && (
        <SessionResult
          data={currentSession}
          onBack={handleBack}
          onViewResources={handleViewResources}
        />
      )}
      {view === 'resources' && currentSession && (
        <ResourcesPresenter
          data={currentSession}
          onBack={handleBackToResult}
        />
      )}
    </>
  );
}

export default App;