import React, { useState, useRef, useCallback } from 'react';
import Home from './components/Home';
import SessionResult from './components/SessionResult';
import { SessionData, ResourceUpdateCallback, GeneratedImage, Organizer } from './types';

type ViewState = 'home' | 'result';

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);

  // Ref to store the session for callback updates (avoids stale closure)
  const sessionRef = useRef<SessionData | null>(null);

  // Handle progressive resource updates from background generation
  const handleResourceUpdate: ResourceUpdateCallback = useCallback((type, id, resource) => {
    setCurrentSession(prev => {
      // If state is not yet hydrated but ref exists, use ref as base
      // This handles cases where callback fires before React finishes setting initial state
      const baseSession = prev || sessionRef.current;
      
      if (!baseSession) return prev;

      let nextSession = { ...baseSession };

      if (type === 'image') {
        const img = resource as GeneratedImage;
        const updatedImages = nextSession.resources.images.map(existing =>
          existing.id === id ? img : existing
        );
        nextSession.resources = {
            ...nextSession.resources,
            images: updatedImages
        };
      }

      else if (type === 'diagram') {
        const diag = resource as Organizer;
        const existingDiagrams = nextSession.resources.diagrams || [];
        const diagExists = existingDiagrams.some(d => d.id === id);
        const updatedDiagrams = diagExists
          ? existingDiagrams.map(existing => existing.id === id ? diag : existing)
          : [...existingDiagrams, diag];
        
        nextSession.resources = {
            ...nextSession.resources,
            diagrams: updatedDiagrams
        };
      }

      else if (type === 'section_update') {
        const update = resource as { section: keyof SessionData, field: string, value: string[] };
        nextSession = {
          ...nextSession,
          [update.section]: {
            ...nextSession[update.section] as any,
            [update.field]: update.value
          }
        };
      }

      // Update Ref to keep it in sync for subsequent fast updates
      sessionRef.current = nextSession;
      return nextSession;
    });
  }, []);

  const handleSessionGenerated = (data: SessionData) => {
    sessionRef.current = data;
    setCurrentSession(data);
    setView('result');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setView('home');
    setCurrentSession(null);
    sessionRef.current = null;
  };

  return (
    <>
      {view === 'home' && (
        <Home
          onSessionGenerated={handleSessionGenerated}
          onResourceUpdate={handleResourceUpdate}
        />
      )}
      {view === 'result' && currentSession && (
        <SessionResult
          data={currentSession}
          formatId="minedu"
          onBack={handleBack}
          onResourceUpdate={handleResourceUpdate}
        />
      )}
    </>
  );
}

export default App;