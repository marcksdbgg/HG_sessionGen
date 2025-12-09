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
      if (!prev) return prev;

      if (type === 'image') {
        const img = resource as GeneratedImage;
        const updatedImages = prev.resources.images.map(existing =>
          existing.id === id ? img : existing
        );
        return {
          ...prev,
          resources: {
            ...prev.resources,
            images: updatedImages
          }
        };
      }

      if (type === 'diagram') {
        const diag = resource as Organizer;
        const existingDiagrams = prev.resources.diagrams || [];
        const diagExists = existingDiagrams.some(d => d.id === id);
        const updatedDiagrams = diagExists
          ? existingDiagrams.map(existing => existing.id === id ? diag : existing)
          : [...existingDiagrams, diag];
        return {
          ...prev,
          resources: {
            ...prev.resources,
            diagrams: updatedDiagrams
          }
        };
      }

      if (type === 'section_update') {
        const update = resource as { section: keyof SessionData, field: string, value: string[] };
        return {
          ...prev,
          [update.section]: {
            ...prev[update.section] as any,
            [update.field]: update.value
          }
        };
      }

      return prev;
    });
  }, []);

  const handleSessionGenerated = (data: SessionData, onResourceUpdate: ResourceUpdateCallback) => {
    sessionRef.current = data;
    setCurrentSession(data);
    setView('result');
    window.scrollTo(0, 0);

    // The onResourceUpdate callback from Home is already wired to SessionGenerator
    // We just need to ensure our handleResourceUpdate is called
    // This is handled by the ref pattern in Home.tsx
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
          onSessionGenerated={(data, callback) => {
            handleSessionGenerated(data, callback);
          }}
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