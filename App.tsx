import React, { useState } from 'react';
import Home from './components/Home';
import SessionResult from './components/SessionResult';
import ResourcesPresenter from './components/ResourcesPresenter';
import { SessionData } from './types';

type ViewState = 'home' | 'result' | 'resources';

interface SessionContext {
  data: SessionData;
  nivel: string;
}

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);

  const handleSessionGenerated = (data: SessionData, nivel?: string) => {
    setSessionContext({ data, nivel: nivel || 'Primaria' });
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
      {view === 'result' && sessionContext && (
        <SessionResult
          data={sessionContext.data}
          onBack={handleBack}
          onViewResources={handleViewResources}
        />
      )}
      {view === 'resources' && sessionContext && (
        <ResourcesPresenter
          data={sessionContext.data}
          nivel={sessionContext.nivel}
          onBack={handleBackToResult}
        />
      )}
    </>
  );
}

export default App;
