# Project Structure

```
HG_sessionGen/
├── .env.local
├── .gitignore
├── App.tsx
├── components
│   ├── DiagramRenderer.tsx
│   ├── Home.tsx
│   ├── ResourcesPresenter.tsx
│   └── SessionResult.tsx
├── constants.ts
├── core
│   ├── ExportManager.ts
│   ├── ExternalResourceResolver.ts
│   ├── FormatPackManager.ts
│   ├── PromptComposer.ts
│   ├── RetryPolicy.ts
│   └── SessionGenerator.ts
├── formats
│   └── index.ts
├── index.html
├── index.tsx
├── metadata.json
├── package.json
├── prompts
│   ├── index.ts
│   ├── prompt_diagramas.ts
│   ├── prompt_fichas.ts
│   ├── prompt_imagenes.ts
│   ├── prompt_inicial.ts
│   ├── prompt_maestro.ts
│   ├── prompt_primaria.ts
│   ├── prompt_recursos.ts
│   └── prompt_secundaria.ts
├── schemas
│   └── sessionSchema.ts
├── services
│   ├── exportService.ts
│   └── geminiService.ts
├── tsconfig.json
├── types.ts
├── utils
│   ├── markdownParser.tsx
│   └── normalization.ts
└── vite.config.ts
```

# Full Codebase

## File: `package.json`
```json
{
  "name": "aula-express",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "lucide-react": "^0.556.0",
    "@google/genai": "^1.31.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}

```

## File: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "types": [
      "node"
    ],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

## File: `.env.local`
```local
GEMINI_API_KEY = AIzaSyCax6m2EfGZ-2Ng08yxNAylCUfpG1KrUxc
```

## File: `.gitignore`
```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

## File: `App.tsx`
```tsx
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
```

## File: `components\DiagramRenderer.tsx`
```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Organizer, OrganizerType } from '../types';
import { AlertCircle, Download, Maximize2, Minimize2, RefreshCw, Copy, Check } from 'lucide-react';

// Mermaid configuration
declare const mermaid: any;

/**
 * DiagramRenderer - Renders Mermaid diagrams with high resolution support
 * Supports: concept maps, fishbone diagrams, flowcharts, mind maps, etc.
 */

interface DiagramRendererProps {
    organizer: Organizer;
    className?: string;
    onError?: (error: string) => void;
}

// Type-specific styling configurations
const TYPE_STYLES: Record<OrganizerType, { bgColor: string; borderColor: string; icon: string }> = {
    'mapa-conceptual': { bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: '🗺️' },
    'espina-pescado': { bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '🐟' },
    'cruz-esquematica': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200', icon: '✝️' },
    'diagrama-flujo': { bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: '📊' },
    'cuadro-sinoptico': { bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: '📋' },
    'mapa-mental': { bgColor: 'bg-pink-50', borderColor: 'border-pink-200', icon: '🧠' },
    'linea-tiempo': { bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', icon: '📅' },
    'cuadro-comparativo': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: '⚖️' },
    'arbol-ideas': { bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '🌳' },
    'diagrama-venn': { bgColor: 'bg-violet-50', borderColor: 'border-violet-200', icon: '⭕' },
    'otro': { bgColor: 'bg-slate-50', borderColor: 'border-slate-200', icon: '📐' }
};

const DiagramRenderer: React.FC<DiagramRendererProps> = ({ organizer, className = '', onError }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rendered, setRendered] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const style = TYPE_STYLES[organizer.type] || TYPE_STYLES['otro'];

    // Initialize Mermaid
    const initMermaid = useCallback(() => {
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: 14,
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis',
                    padding: 20,
                    nodeSpacing: 50,
                    rankSpacing: 50
                },
                mindmap: {
                    useMaxWidth: true,
                    padding: 20
                },
                themeVariables: {
                    primaryColor: '#3b82f6',
                    primaryTextColor: '#1e293b',
                    primaryBorderColor: '#60a5fa',
                    lineColor: '#64748b',
                    secondaryColor: '#f1f5f9',
                    tertiaryColor: '#e2e8f0'
                }
            });
            return true;
        }
        return false;
    }, []);

    // Render diagram
    const renderDiagram = useCallback(async () => {
        if (!containerRef.current || !organizer.mermaidCode) return;

        try {
            setError(null);

            // Check if mermaid is loaded
            if (typeof mermaid === 'undefined') {
                throw new Error('Mermaid library not loaded');
            }

            initMermaid();

            // Clean and validate mermaid code
            let cleanCode = organizer.mermaidCode
                .replace(/```mermaid/g, '') // Remove markdown code blocks if present
                .replace(/```/g, '')
                .trim();
                
            // Fix common issue: quoted newlines literal "\n" which some parsers output
            cleanCode = cleanCode.replace(/\\n/g, '\n');

            // Fix: Ensure graph declaration is on its own line
            // e.g., "graph TD A[...]" -> "graph TD\nA[...]"
            cleanCode = cleanCode.replace(/^(graph|flowchart)\s+([A-Za-z0-9]+)\s+([^\n])/, '$1 $2\n$3');
            // e.g., "mindmap root((...))" -> "mindmap\nroot((...))"
            cleanCode = cleanCode.replace(/^mindmap\s+([^\n])/, 'mindmap\n$1');

            // Clear previous content
            containerRef.current.innerHTML = '';

            // Create unique ID for this diagram
            const diagramId = `diagram-${organizer.id}-${Date.now()}`;

            // Render the diagram
            const { svg } = await mermaid.render(diagramId, cleanCode);

            // Insert SVG with responsive sizing
            containerRef.current.innerHTML = svg;

            // Style the SVG for high resolution
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.minHeight = '200px';
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }

            setRendered(true);
        } catch (err: any) {
            console.error('Mermaid render error:', err);
            const errorMsg = err.message || 'Error rendering diagram';
            setError(errorMsg);
            onError?.(errorMsg);

            // Show fallback text
            if (containerRef.current && organizer.textFallback) {
                containerRef.current.innerHTML = `
          <div class="p-4 bg-slate-100 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-mono">
            ${organizer.textFallback}
          </div>
        `;
            }
        }
    }, [organizer, initMermaid, onError]);

    // Effect to load Mermaid and render
    useEffect(() => {
        // Check if mermaid is already loaded
        if (typeof mermaid !== 'undefined') {
            renderDiagram();
            return;
        }

        // Load Mermaid from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.async = true;
        script.onload = () => {
            renderDiagram();
        };
        script.onerror = () => {
            setError('Failed to load Mermaid library');
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, [renderDiagram, retryCount]);

    // Download as SVG
    const handleDownloadSVG = () => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${organizer.title.replace(/\s+/g, '_')}.svg`;
        link.click();

        URL.revokeObjectURL(url);
    };

    // Download as PNG (high resolution)
    const handleDownloadPNG = () => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // High resolution: 2x scale
        const scale = 2;
        const svgRect = svgElement.getBoundingClientRect();
        canvas.width = svgRect.width * scale;
        canvas.height = svgRect.height * scale;

        img.onload = () => {
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${organizer.title.replace(/\s+/g, '_')}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                }, 'image/png', 1.0);
            }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    // Copy Mermaid code
    const handleCopyCode = () => {
        navigator.clipboard.writeText(organizer.mermaidCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Retry render
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError(null);
        setRendered(false);
    };

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${style.bgColor} border-b ${style.borderColor} rounded-t-xl`}>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                        <h4 className="font-bold text-slate-800">{organizer.title}</h4>
                        <span className="text-xs text-slate-500 capitalize">{organizer.type.replace('-', ' ')}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopyCode}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                        title="Copiar código Mermaid"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleDownloadPNG}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                        title="Descargar PNG"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Diagram container */}
            <div className={`p-6 bg-white border-x border-b ${style.borderColor} rounded-b-xl min-h-[300px] flex items-center justify-center`}>
                {error ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Error en el diagrama</span>
                        </div>
                        <p className="text-sm text-slate-500">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mx-auto"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reintentar
                        </button>
                        {organizer.textFallback && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-mono text-left max-w-full overflow-auto">
                                {organizer.textFallback}
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        className="w-full overflow-auto diagram-container"
                        style={{ minHeight: '250px' }}
                    />
                )}
            </div>

            {/* Description/Notes */}
            {(organizer.description || organizer.notes) && rendered && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl text-sm">
                    {organizer.description && (
                        <p className="text-slate-700">{organizer.description}</p>
                    )}
                    {organizer.notes && (
                        <p className="text-slate-500 mt-2 italic">📝 {organizer.notes}</p>
                    )}
                </div>
            )}

            {/* Fullscreen close button */}
            {isFullscreen && (
                <button
                    onClick={toggleFullscreen}
                    className="fixed top-4 right-4 p-3 bg-slate-800 text-white rounded-full shadow-xl hover:bg-slate-700 transition-colors z-50"
                >
                    <Minimize2 className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};

export default DiagramRenderer;
```

## File: `components\Home.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { NIVELES, GRADOS_INICIAL, GRADOS_PRIMARIA, GRADOS_SECUNDARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData, ResourceUpdateCallback, GeneratedImage, Organizer } from '../types';
import { SessionGenerator } from '../core/SessionGenerator';
import { Mic, Loader2, Sparkles, History, ArrowRight } from 'lucide-react';

interface HomeProps {
    onSessionGenerated: (data: SessionData) => void;
    onResourceUpdate: ResourceUpdateCallback;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated, onResourceUpdate }) => {
    const [nivel, setNivel] = useState(NIVELES[1]);
    const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
    const [area, setArea] = useState(AREAS[0]);
    const [prompt, setPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Generando sesión...');
    const [history, setHistory] = useState<SessionRecord[]>([]);
    const recognitionRef = useRef<any>(null);

    // Update grades when level changes
    useEffect(() => {
        if (nivel === 'Inicial') setGrado(GRADOS_INICIAL[0]);
        else if (nivel === 'Primaria') setGrado(GRADOS_PRIMARIA[0]);
        else if (nivel === 'Secundaria') setGrado(GRADOS_SECUNDARIA[0]);
    }, [nivel]);

    useEffect(() => {
        const saved = localStorage.getItem('aula_history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved).slice(0, 3));
            } catch (e) {
                console.error("History load error", e);
            }
        }

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'es-PE';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setPrompt(prev => prev + (prev ? ' ' : '') + transcript);
                setIsListening(false);
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, []);

    const toggleMic = () => {
        if (!recognitionRef.current) {
            alert("Tu navegador no soporta dictado por voz.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const handleSubmit = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setLoadingText("Interpretando pedido...");

        const messages = ["Estructurando momentos...", "Diseñando estrategias...", "Creando fichas...", "Preparando recursos..."];
        let msgIdx = 0;
        const interval = setInterval(() => {
            setLoadingText(messages[msgIdx % messages.length]);
            msgIdx++;
        }, 2500);

        try {
            const request: SessionRequest = { nivel, grado, area, prompt };

            // Pass the parent's onResourceUpdate directly. 
            // App.tsx manages the session state, so this connects the background 
            // process directly to the App's state updater.
            const data = await SessionGenerator.generateWithCallback(request, onResourceUpdate);

            const newRecord: SessionRecord = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                data,
                preview: data.sessionTitle
            };

            // Update state with data (images still loading in background)
            const newHistory = [newRecord, ...history].slice(0, 3);
            setHistory(newHistory);

            // Prepare lightweight history for localStorage (exclude base64 images)
            const cleanHistory = newHistory.map(rec => ({
                ...rec,
                data: {
                    ...rec.data,
                    resources: {
                        ...rec.data.resources,
                        images: rec.data.resources?.images?.map(img => {
                            // Create a copy without base64Data to save space
                            const { base64Data, ...rest } = img;
                            return rest;
                        }) || []
                    }
                }
            }));

            try {
                localStorage.setItem('aula_history', JSON.stringify(cleanHistory));
            } catch (e) {
                console.warn("Could not save to localStorage (quota exceeded?)", e);
            }

            clearInterval(interval);

            // Notify parent to switch view and show data
            onSessionGenerated(data);

        } catch (error) {
            clearInterval(interval);
            alert("Hubo un error. Por favor intenta de nuevo.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadFromHistory = (record: SessionRecord) => {
        onSessionGenerated(record.data);
    };

    const getGrades = () => {
        if (nivel === 'Inicial') return GRADOS_INICIAL;
        if (nivel === 'Secundaria') return GRADOS_SECUNDARIA;
        return GRADOS_PRIMARIA;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
            <div className="w-full max-w-lg space-y-8 mt-4 sm:mt-10">

                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-2">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Aula Express</h1>
                    <p className="text-slate-500 font-medium">Generador modular de sesiones de aprendizaje.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
                    <div className="p-6 space-y-5">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nivel</label>
                                <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-medium">
                                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Grado</label>
                                <select value={grado} onChange={(e) => setGrado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-medium">
                                    {getGrades().map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Área</label>
                            <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-medium">
                                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">¿Qué quieres enseñar hoy?</label>
                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ej: La célula para secundaria, con maqueta comestible..."
                                    className="block w-full p-4 pb-12 text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent resize-none h-32 transition-all"
                                />
                                <button
                                    onClick={toggleMic}
                                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-primary shadow-sm border border-slate-200'}`}
                                >
                                    <Mic className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !prompt.trim()}
                            className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${loading || !prompt.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'}`}
                        >
                            {loading ? <><Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />{loadingText}</> : "Generar Sesión"}
                        </button>
                    </div>
                </div>

                {history.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400 px-1">
                            <History className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Recientes</span>
                        </div>
                        <div className="grid gap-3">
                            {history.map(record => (
                                <button key={record.id} onClick={() => loadFromHistory(record)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all text-left w-full">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 line-clamp-1">{record.preview}</h3>
                                        <p className="text-xs text-slate-400 mt-1">{record.data.area} • {record.data.cycleGrade}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
```

## File: `components\ResourcesPresenter.tsx`
```tsx
import React, { useState } from 'react';
import { VirtualResources, GeneratedImage, Organizer } from '../types';
import DiagramRenderer from './DiagramRenderer';
import { Maximize2, X, Download, Image as ImageIcon, Layout, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface ResourcesPresenterProps {
    resources: VirtualResources;
    onClose: () => void;
    initialImage?: GeneratedImage | null;
}

const ResourcesPresenter: React.FC<ResourcesPresenterProps> = ({ resources, onClose, initialImage }) => {
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(initialImage || null);

    // Support for multiple diagrams
    const allOrganizers = [resources.organizer, ...(resources.diagrams || [])];
    const [activeOrganizerIdx, setActiveOrganizerIdx] = useState(0);

    // Filter valid images
    const validImages = resources.images.filter(img => img.base64Data);

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage) return;
        const idx = validImages.findIndex(img => img.id === selectedImage.id);
        const nextIdx = (idx + 1) % validImages.length;
        setSelectedImage(validImages[nextIdx]);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage) return;
        const idx = validImages.findIndex(img => img.id === selectedImage.id);
        const prevIdx = (idx - 1 + validImages.length) % validImages.length;
        setSelectedImage(validImages[prevIdx]);
    };

    const handleNextOrganizer = () => {
        setActiveOrganizerIdx(prev => (prev + 1) % allOrganizers.length);
    };

    const handlePrevOrganizer = () => {
        setActiveOrganizerIdx(prev => (prev - 1 + allOrganizers.length) % allOrganizers.length);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage || !selectedImage.base64Data) return;

        const link = document.createElement('a');
        link.href = selectedImage.base64Data;
        link.download = `Recurso-${selectedImage.title.replace(/\s+/g, '-')}.png`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto animate-in fade-in duration-300 font-sans">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-900 text-slate-300 rounded-full hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Sala de Proyección</h2>
                        <p className="text-sm text-slate-400">Recursos didácticos virtuales</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-12">

                {/* Visual Organizer Section */}
                <section>
                    <div className="flex items-center justify-between mb-6 text-emerald-400 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-3">
                            <Layout className="w-6 h-6" />
                            <h3 className="font-bold text-xl uppercase tracking-wider">Organizadores Visuales</h3>
                        </div>
                        {allOrganizers.length > 1 && (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <button onClick={handlePrevOrganizer} className="p-1 hover:text-white bg-slate-800 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                                <span>{activeOrganizerIdx + 1} / {allOrganizers.length}</span>
                                <button onClick={handleNextOrganizer} className="p-1 hover:text-white bg-slate-800 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/50 border-4 border-slate-800 relative">
                        {/* Pass a key to force re-render when switching organizers */}
                        <DiagramRenderer
                            key={allOrganizers[activeOrganizerIdx].id}
                            organizer={allOrganizers[activeOrganizerIdx]}
                            className="min-h-[500px]"
                        />
                    </div>
                </section>

                {/* Images Grid Section */}
                {resources.images.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6 text-sky-400 border-b border-slate-800 pb-2">
                            <ImageIcon className="w-6 h-6" />
                            <h3 className="font-bold text-xl uppercase tracking-wider">Galería de Imágenes</h3>
                            {resources.images.some(img => img.isLoading) && (
                                <span className="text-xs text-slate-500 ml-2">(generando...)</span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {resources.images.map((img) => (
                                <div
                                    key={img.id}
                                    className={`group relative bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-300 shadow-xl flex flex-col ${img.base64Data
                                            ? 'border-slate-800 hover:border-sky-500 hover:shadow-sky-500/20 cursor-pointer'
                                            : 'border-slate-700 opacity-70'
                                        }`}
                                    onClick={() => img.base64Data && setSelectedImage(img)}
                                >
                                    <div className="aspect-[4/3] w-full overflow-hidden bg-black relative">
                                        {img.base64Data ? (
                                            <>
                                                <img
                                                    src={img.base64Data}
                                                    alt={img.title}
                                                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                            </>
                                        ) : (
                                            // Loading placeholder
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 animate-pulse">
                                                <div className="w-12 h-12 border-4 border-slate-600 border-t-sky-500 rounded-full animate-spin mb-3"></div>
                                                <span className="text-slate-500 text-sm">Generando imagen...</span>
                                            </div>
                                        )}

                                        <div className="absolute bottom-3 left-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${img.moment === 'Inicio' ? 'bg-blue-600/90 text-white' :
                                                    img.moment === 'Desarrollo' ? 'bg-indigo-600/90 text-white' :
                                                        'bg-amber-600/90 text-white'
                                                }`}>
                                                {img.moment}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between bg-slate-900">
                                        <h4 className="font-bold text-slate-100 text-lg leading-tight mb-2 group-hover:text-sky-400 transition-colors">{img.title}</h4>
                                        <div className="flex items-center text-xs text-slate-500 gap-1">
                                            {img.base64Data ? (
                                                <>
                                                    <Maximize2 className="w-3 h-3" />
                                                    <span>Clic para ampliar</span>
                                                </>
                                            ) : (
                                                <span className="italic">Preparando recurso...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Lightbox / Presentation Mode */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-200">

                    {/* Lightbox Header */}
                    <div className="absolute top-0 w-full z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                        <h3 className="text-lg font-bold text-white/90 drop-shadow-md px-4">{selectedImage.title}</h3>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDownload}
                                className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-sm"
                                title="Descargar"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="p-3 bg-white/10 text-white rounded-full hover:bg-red-500/80 transition-all backdrop-blur-sm"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Main Image Area */}
                    <div className="flex-1 flex items-center justify-center relative p-4 group">

                        {/* Navigation Buttons (visible on hover) */}
                        {validImages.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-4 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-110"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-4 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-110"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}

                        <img
                            src={selectedImage.base64Data}
                            alt={selectedImage.title}
                            className="max-h-full max-w-full object-contain shadow-2xl drop-shadow-2xl"
                        />
                    </div>

                    {/* Footer Info */}
                    <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div className="max-w-4xl mx-auto text-center">
                            <p className="text-slate-300 text-sm md:text-base font-medium bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                                {selectedImage.prompt}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesPresenter;

```

## File: `components\SessionResult.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { SessionData, GeneratedImage, ResourceUpdateCallback } from '../types';
import { ExportManager } from '../core/ExportManager';
import { SessionGenerator } from '../core/SessionGenerator';
import { copyToClipboard } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, BookOpen, Clock, Edit3, Check, MonitorPlay, Image as ImageIcon, Sparkles, RefreshCw, X, Loader2 } from 'lucide-react';
import { MarkdownText, groupItemsByHeaders, ExternalResourceRenderer, isExternalResource } from '../utils/markdownParser';
import ResourcesPresenter from './ResourcesPresenter';
import { fuzzyMatchImage } from '../utils/normalization';

interface SessionResultProps {
    data: SessionData;
    formatId: string;
    onBack: () => void;
    onResourceUpdate?: ResourceUpdateCallback;
}

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group/tooltip">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

/**
 * Parses text to find {{imagen:Title}} tags and renders them as interactive buttons.
 */
const SmartTextRenderer: React.FC<{
    text: string;
    images: GeneratedImage[] | undefined;
    onOpenImage: (img: GeneratedImage) => void;
}> = ({ text, images, onOpenImage }) => {
    if (!text) return null;

    // Regex to find {{imagen:Title}}
    const parts = text.split(/(\{\{imagen:.*?\}\})/g);

    return (
        <span className="text-slate-700 leading-relaxed">
            {parts.map((part, index) => {
                const match = part.match(/\{\{imagen:(.*?)\}\}/);
                if (match) {
                    const titleRef = match[1].trim();
                    // Refactor: Use fuzzy matching utility
                    const imgMatch = fuzzyMatchImage(titleRef, images);

                    // Find actual image object if ID matches
                    const img = imgMatch ? images?.find(i => i.id === imgMatch.id) : undefined;

                    if (img && (img.base64Data || img.isLoading)) {
                        return (
                            <button
                                key={index}
                                onClick={() => onOpenImage(img)}
                                className={`inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 border rounded-md text-sm font-semibold transition-all align-middle cursor-pointer ${
                                    img.isLoading 
                                    ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-wait'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:scale-105'
                                }`}
                            >
                                {img.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ImageIcon className="w-3.5 h-3.5" />}
                                <span className="underline decoration-indigo-300 underline-offset-2">
                                    {img.title}
                                    {img.isLoading && '...'}
                                </span>
                            </button>
                        );
                    } else {
                        // Fallback if image not found or failed
                        return <span key={index} className="text-slate-500 italic mx-1">[{titleRef}]</span>;
                    }
                }
                return <MarkdownText key={index} text={part} />;
            })}
        </span>
    );
};

const EditableList: React.FC<{
    items: string[];
    isEditing: boolean;
    images?: GeneratedImage[];
    onChange: (newItems: string[]) => void;
    onOpenImage: (img: GeneratedImage) => void;
}> = ({ items, isEditing, images, onChange, onOpenImage }) => {
    if (isEditing) {
        return (
            <textarea
                className="w-full p-3 text-sm border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px] bg-emerald-50/30 transition-all duration-200"
                value={items.join('\n')}
                onChange={(e) => onChange(e.target.value.split('\n'))}
                placeholder="Escribe cada elemento en una línea separada..."
            />
        );
    }
    return (
        <ul className="space-y-2">
            {items.map((item, idx) => {
                // Check if this is an external resource (VID_YT, IMG_URL, etc.)
                if (isExternalResource(item)) {
                    return (
                        <li key={idx} className="list-none ml-0">
                            <ExternalResourceRenderer item={item} />
                        </li>
                    );
                }
                // Regular item with potential {{imagen:}} tags
                return (
                    <li key={idx} className="flex items-start">
                        <span className="mr-2 text-primary font-bold mt-1.5">•</span>
                        <div className="flex-1">
                            <SmartTextRenderer text={item} images={images} onOpenImage={onOpenImage} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

const SectionHeader: React.FC<{
    title: string;
    icon: React.ReactNode;
    colorClass: string;
    onRegenerate?: () => void;
    isLoading?: boolean;
    isEditing?: boolean;
}> = ({ title, icon, colorClass, onRegenerate, isLoading, isEditing }) => (
    <div className={`px-6 py-4 border-b flex items-center justify-between ${colorClass} ${isEditing ? 'ring-2 ring-emerald-400 ring-inset' : ''}`}>
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-lg">{title}</h3>
        </div>
        {onRegenerate && (
            <Tooltip text={isEditing ? "Regenerar con IA" : "Activa el modo edición para regenerar"}>
                <button
                    onClick={isEditing ? onRegenerate : undefined}
                    disabled={isLoading || !isEditing}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isEditing
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isLoading ? 'Regenerando...' : 'Regenerar'}</span>
                </button>
            </Tooltip>
        )}
    </div>
);

const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, formatId, onBack, onResourceUpdate }) => {
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [printSection, setPrintSection] = useState<'none' | 'session' | 'ficha_aula' | 'ficha_casa'>('none');
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Presentation State
    const [showPresentation, setShowPresentation] = useState(false);
    const [presentationInitialImage, setPresentationInitialImage] = useState<GeneratedImage | null>(null);

    // Sync local state with parent data prop (for progressive resource updates)
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const handleCopyLatex = () => {
        const latex = ExportManager.generateLatex(data);
        copyToClipboard(latex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = (section: 'session' | 'ficha_aula' | 'ficha_casa') => {
        setPrintSection(section);
        setTimeout(() => {
            window.print();
            setPrintSection('none');
        }, 100);
    };

    const handleRegenerate = async (section: keyof SessionData, instructions: string) => {
        if (!confirm("¿Deseas regenerar esta sección? Se perderán los cambios manuales.")) return;
        setRegenerating(section as string);
        try {
            const newData = await SessionGenerator.regenerateSection(data, section, instructions);
            setData(prev => ({ ...prev, [section]: newData }));
        } catch (e) {
            alert("Error regenerando sección.");
        } finally {
            setRegenerating(null);
        }
    };

    const handleRecoverImages = async () => {
        setRegenerating('images');
        try {
            const newData = await SessionGenerator.recoverImages(data);
            setData(newData);
        } catch (e) {
            alert("Error recuperando imágenes.");
        } finally {
            setRegenerating(null);
        }
    };

    const updateSection = (section: keyof SessionData, field: string, value: any) => {
        setData(prev => ({
            ...prev,
            [section]: {
                ...prev[section] as any,
                [field]: value
            }
        }));
    };

    const handleOpenImage = (img: GeneratedImage) => {
        setPresentationInitialImage(img);
        setShowPresentation(true);
    };

    const isPrinting = printSection !== 'none';
    const showSession = !isPrinting || printSection === 'session';
    const showFichaAula = !isPrinting || printSection === 'ficha_aula';
    const showFichaCasa = !isPrinting || printSection === 'ficha_casa';

    // Check if images need recovery.
    // Logic fix: It is ONLY "missing" if it has no data AND isn't currently loading.
    const hasMissingImages = data.resources?.images?.some(img => !img.base64Data && img.prompt && !img.isLoading);
    
    // Check if we have any images (loading or loaded) to show presentation button
    const hasResources = data.resources && data.resources.images && data.resources.images.length > 0;

    return (
        <>
            {showPresentation && data.resources && (
                <ResourcesPresenter
                    resources={data.resources}
                    initialImage={presentationInitialImage}
                    onClose={() => {
                        setShowPresentation(false);
                        setPresentationInitialImage(null);
                    }}
                />
            )}

            <div className={`min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0 ${isPrinting ? 'print-mode' : ''} ${showPresentation ? 'hidden' : ''}`}>

                {/* Navbar */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
                    <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Volver
                    </button>
                    <div className="flex items-center gap-3">
                        {hasMissingImages && (
                            <Tooltip text="Las imágenes no se guardaron en el historial para ahorrar espacio. Click para regenerarlas.">
                                <button
                                    onClick={handleRecoverImages}
                                    disabled={!!regenerating}
                                    className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                                >
                                    <RefreshCw className={`w-4 h-4 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                                    <span>Restaurar Imágenes</span>
                                </button>
                            </Tooltip>
                        )}

                        {hasResources && !hasMissingImages && (
                            <Tooltip text="Ver todos los recursos (Organizador + Imágenes)">
                                <button
                                    onClick={() => setShowPresentation(true)}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-black transition-all shadow-md"
                                >
                                    <MonitorPlay className="w-4 h-4" />
                                    <span>Presentación</span>
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip text={isEditing ? "Guardar cambios" : "Editar contenido de la sesión"}>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-md ${isEditing
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 ring-2 ring-emerald-300 ring-offset-2'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                <span className="hidden sm:inline">{isEditing ? 'Guardar' : 'Editar'}</span>
                            </button>
                        </Tooltip>
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-all">
                                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar</span>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 hidden group-hover:block z-30">
                                <button onClick={() => handlePrint('session')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📄 PDF Sesión</button>
                                <button onClick={() => handlePrint('ficha_aula')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📝 PDF Ficha Aula</button>
                                <button onClick={() => handlePrint('ficha_casa')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">🏠 PDF Ficha Casa</button>
                                <button onClick={handleCopyLatex} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                                    <span>LaTeX</span>
                                    <FileJson className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="sticky top-[60px] z-10 mx-4 mt-4 no-print">
                        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                                <span className="font-bold">✏️ Modo Edición Activo</span>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><X className="w-4 h-4" /> Salir</button>
                        </div>
                    </div>
                )}

                {/* Mobile Presentation Button */}
                {!showPresentation && hasResources && !hasMissingImages && (
                    <div className="sm:hidden mx-4 mt-4">
                        <button onClick={() => setShowPresentation(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg">
                            <MonitorPlay className="w-5 h-5" />
                            <span>Ver Recursos Virtuales</span>
                        </button>
                    </div>
                )}

                {/* Mobile Recovery Button */}
                {hasMissingImages && (
                    <div className="sm:hidden mx-4 mt-4">
                        <button
                            onClick={handleRecoverImages}
                            disabled={!!regenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-100 text-amber-800 border border-amber-200"
                        >
                            <RefreshCw className={`w-5 h-5 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                            <span>Restaurar Imágenes</span>
                        </button>
                    </div>
                )}

                <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
                    <div className={showSession ? 'block' : 'hidden'}>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none">
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{data.sessionTitle}</h1>
                            <p className="text-slate-500">{data.area} • {data.cycleGrade}</p>
                        </div>

                        <div className="space-y-6">
                            {/* INICIO */}
                            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                <SectionHeader
                                    title="Inicio"
                                    icon={<Clock className="w-5 h-5" />}
                                    colorClass="bg-blue-50 text-blue-800 border-blue-100"
                                    onRegenerate={() => handleRegenerate('inicio', 'Cambia la motivación.')}
                                    isLoading={regenerating === 'inicio'}
                                    isEditing={isEditing}
                                />
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivación</span>
                                        <EditableList
                                            items={data.inicio.motivacion}
                                            isEditing={isEditing}
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('inicio', 'motivacion', val)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saberes Previos</span>
                                        <EditableList
                                            items={data.inicio.saberesPrevios}
                                            isEditing={isEditing}
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('inicio', 'saberesPrevios', val)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* DESARROLLO */}
                            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                <SectionHeader
                                    title="Desarrollo"
                                    icon={<BookOpen className="w-5 h-5" />}
                                    colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
                                    onRegenerate={() => handleRegenerate('desarrollo', 'Genera estrategias más interactivas.')}
                                    isLoading={regenerating === 'desarrollo'}
                                    isEditing={isEditing}
                                />
                                <div className="p-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias</span>
                                        <EditableList
                                            items={data.desarrollo.estrategias}
                                            isEditing={isEditing}
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('desarrollo', 'estrategias', val)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CIERRE */}
                            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                <SectionHeader
                                    title="Cierre"
                                    icon={<Clock className="w-5 h-5" />}
                                    colorClass="bg-amber-50 text-amber-800 border-amber-100"
                                    onRegenerate={() => handleRegenerate('cierre', 'Mejora las estrategias.')}
                                    isLoading={regenerating === 'cierre'}
                                    isEditing={isEditing}
                                />
                                <div className="p-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias de Cierre</span>
                                        <EditableList
                                            items={data.cierre.estrategias}
                                            isEditing={isEditing}
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('cierre', 'estrategias', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fichas logic remains same... */}
                    <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
                        <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                            <div className="border-b border-blue-100 pb-4 mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Aplicación: Aula</h2>
                                <p className="text-sm text-slate-500">{data.fichas.aula.titulo}</p>
                            </div>
                            <div className="space-y-3">
                                {groupItemsByHeaders(data.fichas.aula.items).map((group, groupIdx) => (
                                    <div key={groupIdx} className="rounded-xl overflow-hidden bg-slate-50 p-4 border border-slate-100">
                                        {group.header && <div className="font-bold text-blue-600 mb-2">{group.header}</div>}
                                        {group.items.map((item, i) => <div key={i} className="mb-2"><MarkdownText text={item} /></div>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
                        <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                            <div className="border-b border-amber-100 pb-4 mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Extensión: Casa</h2>
                                <p className="text-sm text-slate-500">{data.fichas.casa.titulo}</p>
                            </div>
                            <div className="space-y-3">
                                {groupItemsByHeaders(data.fichas.casa.items).map((group, groupIdx) => (
                                    <div key={groupIdx} className="rounded-xl overflow-hidden bg-slate-50 p-4 border border-slate-100">
                                        {group.header && <div className="font-bold text-amber-600 mb-2">{group.header}</div>}
                                        {group.items.map((item, i) => <div key={i} className="mb-2"><MarkdownText text={item} /></div>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
            @media print {
                body { background: white; }
                .no-print { display: none !important; }
                .print-mode .hidden { display: none !important; }
                .print-mode .block { display: block !important; }
            }
        `}</style>
            </div>
        </>
    );
};

export default SessionResult;
```

## File: `constants.ts`
```ts
export const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];

export const GRADOS_INICIAL = ['3 años', '4 años', '5 años'];
export const GRADOS_PRIMARIA = ['1°', '2°', '3°', '4°', '5°', '6°'];
export const GRADOS_SECUNDARIA = ['1°', '2°', '3°', '4°', '5°'];

export const AREAS = [
  'Matemática', 
  'Comunicación', 
  'Personal Social / DPCC', 
  'Ciencia y Tecnología', 
  'Arte y Cultura', 
  'Religión', 
  'Educación Física',
  'Inglés',
  'Ciencias Sociales'
];

```

## File: `core\ExportManager.ts`
```ts
import { SessionData } from "../types";
import { LATEX_TEMPLATE } from "../formats";

export class ExportManager {
  private static escapeLatex(text: string): string {
    if (!text) return "";
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/%/g, '\\%')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}');
  }

  private static formatList(items: string[] | undefined, latexPrefix: string = "\\item "): string {
    if (!items || items.length === 0) return "";
    return "\\begin{itemize}[leftmargin=*,nosep] " + 
      items.map(i => `${latexPrefix}${this.escapeLatex(i)}`).join(" ") + 
      " \\end{itemize}";
  }

  static generateLatex(data: SessionData): string {
    let tex = LATEX_TEMPLATE;

    const safe = (str: string) => this.escapeLatex(str);

    // Metadata
    tex = tex.replace(/\[NOMBRE_SESION\]/g, safe(data.sessionTitle));
    tex = tex.replace(/\[AREA\]/g, safe(data.area));
    tex = tex.replace(/\[CICLO_GRADO\]/g, safe(data.cycleGrade));
    tex = tex.replace(/\[DOCENTE\]/g, safe(data.teacherName));

    // Inicio
    tex = tex.replace(/\[MOTIVACION\]/g, this.formatList(data.inicio.motivacion));
    tex = tex.replace(/\[SABERES_PREVIOS\]/g, this.formatList(data.inicio.saberesPrevios));
    tex = tex.replace(/\[CONFLICTO_COGNITIVO\]/g, this.formatList(data.inicio.conflictoCognitivo));
    tex = tex.replace(/\[PROPOSITO\]/g, this.formatList(data.inicio.propositoDidactico));
    tex = tex.replace(/\[MATERIALES_INICIO\]/g, this.formatList(data.inicio.materiales));

    // Desarrollo
    tex = tex.replace(/\[ESTRATEGIAS_DESARROLLO\]/g, this.formatList(data.desarrollo.estrategias));
    tex = tex.replace(/\[MATERIALES_DESARROLLO\]/g, this.formatList(data.desarrollo.materiales));

    // Cierre
    tex = tex.replace(/\[ESTRATEGIAS_CIERRE\]/g, this.formatList(data.cierre.estrategias));
    tex = tex.replace(/\[MATERIALES_CIERRE\]/g, this.formatList(data.cierre.materiales));

    // Tarea
    tex = tex.replace(/\[ACTIVIDADES_CASA\]/g, this.formatList(data.tareaCasa.actividades));
    tex = tex.replace(/\[MATERIALES_CASA\]/g, this.formatList(data.tareaCasa.materiales));

    return tex;
  }
}

```

## File: `core\ExternalResourceResolver.ts`
```ts
import { ai } from "../services/geminiService";

export class ExternalResourceResolver {
  /**
   * Resolves a search query to a real URL using Google Search Grounding.
   */
  static async resolveLink(query: string, type: 'video' | 'image'): Promise<{title: string, url: string} | null> {
    try {
      const prompt = type === 'video' 
        ? `Busca en YouTube un video educativo sobre: "${query}". Devuelve solo el Título exacto y la URL del primer resultado válido. Prioriza contenido educativo.`
        : `Busca una imagen educativa real de: "${query}". Devuelve solo el Título y la URL de la fuente de la imagen.`;

      // Use a model capable of tools/grounding
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      // 1. Try to extract from Grounding Metadata (Most reliable for 2.5)
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        const webChunk = chunks.find(c => c.web?.uri);
        if (webChunk?.web) {
            return {
                title: webChunk.web.title || query,
                url: webChunk.web.uri
            };
        }
      }
      
      // 2. Fallback: Parse text response if grounding chunks are tricky but text has link
      const text = response.text || "";
      const urlMatch = text.match(/https?:\/\/[^\s)]+/); // Basic URL extraction
      if (urlMatch) {
          return { title: query, url: urlMatch[0] };
      }

      return null;
    } catch (e) {
      console.warn(`External resource resolution failed for ${query}`, e);
      return null;
    }
  }
}
```

## File: `core\FormatPackManager.ts`
```ts
import { Templates } from "../formats";
import { FormatPack, FormatPackId } from "../types";

export class FormatPackManager {
  private static packs: Record<FormatPackId, FormatPack> = {
    minedu: {
      id: 'minedu',
      name: 'MINEDU Clásico',
      description: 'Formato estándar tabular detallado.',
      template: Templates.minedu
    },
    compacto: {
      id: 'compacto',
      name: 'Compacto',
      description: 'Ahorro de papel, estilo lista.',
      template: Templates.compacto
    },
    rural: {
      id: 'rural',
      name: 'Rural Simplificado',
      description: 'Letra grande, secciones esenciales.',
      template: Templates.rural
    }
  };

  static getPack(id: string): FormatPack {
    return this.packs[id as FormatPackId] || this.packs.minedu;
  }

  static getAllPacks(): FormatPack[] {
    return Object.values(this.packs);
  }
}
```

## File: `core\PromptComposer.ts`
```ts
import { Prompts, PromptBase } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  /**
   * Composes the full system prompt using the modular JSON configurations.
   * Teacher instructions are placed FIRST with maximum emphasis.
   */
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest } = request;

    // 0. PRIORITY: Teacher's specific instructions FIRST
    let composed = `╔══════════════════════════════════════════════════════════════╗
║  INSTRUCCIONES PRIORITARIAS DEL DOCENTE - CUMPLIR AL PIE DE LA LETRA  ║
╚══════════════════════════════════════════════════════════════╝

CONTEXTO DE LA SESIÓN:
- Nivel: ${nivel}
- Grado: ${grado}
- Área: ${area}

PEDIDO ESPECÍFICO DEL DOCENTE (MÁXIMA PRIORIDAD):
"${userRequest}"

REGLAS DE INTERPRETACIÓN DE RECURSOS EXTERNOS:
Si el docente pide videos o imágenes reales y NO conoces la URL exacta, usa el formato de BÚSQUEDA:
1. Para videos: "VID_YT: Título Sugerido :: SEARCH: consulta de búsqueda"
2. Para fotos: "IMG_URL: Título Sugerido :: SEARCH: consulta de búsqueda"

Ejemplo: "VID_YT: Canción de las Vocales :: SEARCH: cancion infantil vocales pegadiza"

El sistema resolverá estos enlaces automáticamente. NO inventes URLs falsas.

═══════════════════════════════════════════════════════════════

`;

    // 1. Identity & Core Task (Maestro)
    composed += `${Prompts.maestro.role}\n${Prompts.maestro.task}\n`;
    composed += `Estilo y Reglas: ${Prompts.maestro.style}\n`;
    composed += `Restricciones: ${JSON.stringify(Prompts.maestro.constraints)}\n`;

    // 2. Level Specific Strategy
    let levelConfig: PromptBase = Prompts.primaria; // Default
    if (nivel === 'Inicial') levelConfig = Prompts.inicial;
    if (nivel === 'Secundaria') levelConfig = Prompts.secundaria;

    composed += `\n--- ESTRATEGIA PARA NIVEL ${nivel.toUpperCase()} ---\n`;
    composed += `Enfoque: ${levelConfig.focus}\n`;
    composed += `Materiales Físicos: ${levelConfig.materials}\n`;
    composed += `Tono: ${levelConfig.tone}\n`;
    composed += `Reglas de Grado: ${JSON.stringify(levelConfig.gradeRules)}\n`;

    // 3. Virtual Resources Logic
    composed += `\n--- RECURSOS VIRTUALES (IMPORTANTE) ---\n`;
    composed += `${Prompts.recursos.instruction}\n`;

    // 4. Fichas Logic
    composed += `\n--- FICHAS DE APLICACIÓN ---\n`;
    composed += `${Prompts.fichas.instruction}\n`;

    // 5. Reminder of teacher request at the end
    composed += `\n--- RECORDATORIO FINAL ---\n`;
    composed += `NO OLVIDES cumplir el pedido del docente: "${userRequest}"\n`;

    return composed;
  }

  static composeRegeneration(section: string, currentContent: any, instructions: string): string {
    return `
      Eres el mismo experto pedagogo. Necesito que RE-ESCRIBAS solamente la sección: "${section}".
      
      Contenido actual (para referencia):
      ${JSON.stringify(currentContent)}
      
      Nuevas instrucciones para el cambio:
      "${instructions}"
      
      IMPORTANTE: Devuelve un JSON con la clave raíz exactamente igual a "${section}".
      Ejemplo: { "${section}": { ...contenido... } }
      
      Mantén el formato de esa sección válido según el esquema original.
    `;
  }
}
```

## File: `core\RetryPolicy.ts`
```ts
export class RetryPolicy {
  private maxAttempts: number;
  private baseDelay: number;

  constructor(maxAttempts: number = 3, baseDelay: number = 1000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxAttempts) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1) + (Math.random() * 200); // Jitter
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}
```

## File: `core\SessionGenerator.ts`
```ts
import { ai } from "../services/geminiService";
import { SESSION_SCHEMA } from "../schemas/sessionSchema";
import { PromptComposer } from "./PromptComposer";
import { RetryPolicy } from "./RetryPolicy";
import { SessionData, SessionRequest, GeneratedImage, Organizer, ResourceUpdateCallback } from "../types";
import { Type, Schema } from "@google/genai";
import { slugify } from "../utils/normalization";
import { Prompts } from "../prompts";
import { ExternalResourceResolver } from "./ExternalResourceResolver";

export class SessionGenerator {
    private static retryPolicy = new RetryPolicy();
    private static textModelId = "gemini-2.5-flash";
    private static imageModelId = "gemini-2.5-flash-image";

    /**
     * LEGACY: Blocking generation.
     */
    static async generate(request: SessionRequest): Promise<SessionData> {
        return this.generateWithCallback(request);
    }

    /**
     * NON-BLOCKING: Returns session immediately after text generation.
     * Resources (images, diagrams, external links) are generated in background.
     */
    static async generateWithCallback(
        request: SessionRequest,
        onResourceUpdate?: ResourceUpdateCallback
    ): Promise<SessionData> {
        const fullPrompt = PromptComposer.compose(request);

        // FLOW A: Text Pipeline - Generate Structure (~10-15s)
        let sessionData = await this.generateTextSession(fullPrompt);

        // Defense in Depth: Validate IDs and Structure  
        sessionData = this.validateSessionData(sessionData);

        // Mark all images as loading initially
        if (sessionData.resources?.images) {
            sessionData.resources.images = sessionData.resources.images.map(img => ({
                ...img,
                isLoading: true
            }));
        }

        // FLOW B: Resources Pipeline - Background (fire-and-forget)
        this.enrichResourcesBackground(sessionData, request, onResourceUpdate);

        return sessionData; // Return immediately
    }

    static async recoverImages(data: SessionData): Promise<SessionData> {
        if (!data.resources || !data.resources.images) return data;

        const newData = { ...data };
        newData.resources = { ...data.resources };
        newData.resources.images = [...data.resources.images];

        const imagePromises = newData.resources.images.map(async (img) => {
            if (img.base64Data) return img;
            try {
                const base64 = await this.generateImage(img.prompt);
                return { ...img, base64Data: base64, isLoading: false };
            } catch (e) {
                console.error(`Failed to recover image: ${img.title}`, e);
                return img;
            }
        });

        newData.resources.images = await Promise.all(imagePromises);
        return newData;
    }

    static async regenerateSection(
        currentData: SessionData,
        sectionKey: keyof SessionData,
        instructions: string
    ): Promise<any> {
        let partialSchema: any;

        if (SESSION_SCHEMA.properties && SESSION_SCHEMA.properties[sectionKey]) {
            partialSchema = {
                type: Type.OBJECT,
                properties: {
                    [sectionKey]: SESSION_SCHEMA.properties[sectionKey]
                },
                required: [sectionKey]
            };
        } else {
            throw new Error("Invalid section key for regeneration");
        }

        const prompt = PromptComposer.composeRegeneration(
            String(sectionKey),
            currentData[sectionKey],
            instructions
        );

        return this.retryPolicy.execute(async () => {
            const response = await ai.models.generateContent({
                model: this.textModelId,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: partialSchema
                }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("Empty regeneration response");
            const parsed = JSON.parse(jsonText);
            return parsed[sectionKey];
        });
    }

    // --- Private Helpers ---

    private static async generateTextSession(prompt: string): Promise<SessionData> {
        return this.retryPolicy.execute(async () => {
            const response = await ai.models.generateContent({
                model: this.textModelId,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: SESSION_SCHEMA,
                },
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("Empty response from Gemini");
            return JSON.parse(jsonText) as SessionData;
        });
    }

    private static validateSessionData(data: SessionData): SessionData {
        if (data.resources?.organizer && !data.resources.organizer.id) {
            data.resources.organizer.id = `org-${slugify(data.sessionTitle).slice(0, 10)}`;
        }
        if (data.resources?.images) {
            data.resources.images.forEach((img, idx) => {
                if (!img.id) {
                    img.id = `img-${idx}-${slugify(img.title).slice(0, 15)}`;
                }
            });
        }
        if (!data.resources.diagrams) {
            data.resources.diagrams = [];
        }
        return data;
    }

    /**
     * Background resource enrichment loop.
     */
    private static async enrichResourcesBackground(
        data: SessionData,
        request: SessionRequest,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        const resources = data.resources;

        // 1. Generate images (Parallel)
        const imagePromises = (resources.images || []).map(async (img) => {
            if (img.base64Data) {
                onUpdate?.('image', img.id, { ...img, isLoading: false });
                return;
            }
            try {
                const base64 = await this.generateImage(img.prompt);
                onUpdate?.('image', img.id, { ...img, base64Data: base64, isLoading: false });
            } catch (e) {
                console.error(`Failed to generate image: ${img.title}`, e);
                onUpdate?.('image', img.id, { ...img, isLoading: false, error: 'Failed' });
            }
        });

        // 2. Generate extra diagrams (Parallel)
        const diagramPromises = this.scanAndGenerateDiagramsWithCallback(data, request, onUpdate);

        // 3. Resolve External Links (VID_YT / IMG_URL with SEARCH:)
        // We assume scanAndResolveLinksWithCallback handles the parallel logic internally
        const linkPromises = this.scanAndResolveLinksWithCallback(data, onUpdate);

        // Wait for all to finish (fire-and-forget from caller perspective)
        await Promise.all([
            Promise.allSettled(imagePromises),
            diagramPromises,
            linkPromises
        ]);
    }

    private static async scanAndResolveLinksWithCallback(
        data: SessionData,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        // Sections to scan
        const sections: { key: keyof SessionData, subKey: string, items: string[] }[] = [
            { key: 'inicio', subKey: 'materiales', items: data.inicio.materiales },
            { key: 'desarrollo', subKey: 'materiales', items: data.desarrollo.materiales },
            { key: 'cierre', subKey: 'materiales', items: data.cierre.materiales },
            { key: 'tareaCasa', subKey: 'materiales', items: data.tareaCasa.materiales }
        ];

        // Flatten all items that need resolution
        // Look for: "VID_YT: ... :: SEARCH: ..." or "IMG_URL: ... :: SEARCH: ..."
        const resolutionTasks: Array<() => Promise<void>> = [];

        sections.forEach(section => {
            section.items.forEach((item, index) => {
                const searchMatch = item.match(/^(VID_YT|IMG_URL):\s*(.+?)\s*::\s*SEARCH:\s*(.+)$/i);

                if (searchMatch) {
                    const typeTag = searchMatch[1].toUpperCase() as 'VID_YT' | 'IMG_URL';
                    const title = searchMatch[2];
                    const query = searchMatch[3];
                    const resourceType = typeTag === 'VID_YT' ? 'video' : 'image';

                    resolutionTasks.push(async () => {
                        const resolved = await ExternalResourceResolver.resolveLink(query, resourceType);
                        if (resolved) {
                            // Replace item in the array
                            const newItem = `${typeTag}: ${resolved.title} :: ${resolved.url}`;
                            section.items[index] = newItem; // Update in place for local data reference

                            // Notify UI to update specific section
                            onUpdate?.('section_update', `${section.key}-${section.subKey}`, {
                                section: section.key,
                                field: section.subKey,
                                value: [...section.items] // Send copy of updated array
                            });
                        }
                    });
                }
            });
        });

        await Promise.allSettled(resolutionTasks.map(task => task()));
    }

    private static async scanAndGenerateDiagramsWithCallback(
        data: SessionData,
        request: SessionRequest,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        const diagPrompts: { title: string; instruction: string }[] = [];

        const scanList = (items: string[]) => {
            items.forEach(item => {
                const match = item.match(/DIAG_PROMPT:\s*(.+?)\s*::\s*(.+)/);
                if (match) {
                    diagPrompts.push({ title: match[1], instruction: match[2] });
                }
            });
        };

        if (data.inicio?.materiales) scanList(data.inicio.materiales);
        if (data.desarrollo?.materiales) scanList(data.desarrollo.materiales);
        if (data.cierre?.materiales) scanList(data.cierre.materiales);
        if (data.tareaCasa?.materiales) scanList(data.tareaCasa.materiales);

        if (diagPrompts.length === 0) return;

        await Promise.allSettled(diagPrompts.map(async (dp, idx) => {
            try {
                const promptText = `${Prompts.diagramas.instruction}\n\n` +
                    `CONTEXTO:\nNivel: ${request.nivel}, Grado: ${request.grado}, Area: ${request.area}\n` +
                    `DIAGRAM REQUEST: Title: "${dp.title}", Instruction: "${dp.instruction}"\n\n` +
                    `${Prompts.diagramas.outputContract}\n${Prompts.diagramas.guidelines?.join('\n') || ''}`;

                const response = await ai.models.generateContent({
                    model: this.textModelId,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: { responseMimeType: "application/json" }
                });

                const json = JSON.parse(response.text || "{}");
                if (json.organizer) {
                    const org: Organizer = json.organizer;
                    if (!org.id) org.id = `extra-diag-${idx}-${slugify(dp.title).slice(0, 10)}`;
                    onUpdate?.('diagram', org.id, org);
                }
            } catch (e) {
                console.error(`Failed to generate extra diagram: ${dp.title}`, e);
            }
        }));
    }

    private static async generateImage(prompt: string): Promise<string> {
        const response = await ai.models.generateContent({
            model: this.imageModelId,
            contents: { parts: [{ text: prompt }] },
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image data found in response");
    }

    // Fallback for logic still using the old method if any
    private static async enrichResources(data: SessionData, request: SessionRequest): Promise<SessionData> {
        await this.enrichResourcesBackground(data, request);
        return data;
    }
}
```

## File: `formats\index.ts`
```ts
// Note: Templates are defined as strings to ensure compatibility without specific loaders.

export const LATEX_TEMPLATE = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{tabularx}
\\usepackage{multirow}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{graphicx}
\\usepackage{fancyhdr}

\\geometry{left=2cm, right=2cm, top=2cm, bottom=2cm}

\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\renewcommand{\\arraystretch}{1.4}

\\begin{document}

\\begin{center}
    \\textbf{\\Large [NOMBRE_SESION]}\\\\[0.2cm]
    \\textbf{\\textit{\\small SESIÓN DE APRENDIZAJE}}
\\end{center}

\\vspace{0.3cm}

\\noindent \\textbf{I. DATOS INFORMATIVOS:}

\\vspace{0.2cm}

\\noindent
\\begin{tabular}{ll}
    \\textbf{1.1 Área Curricular} & : [AREA] \\\\
    \\textbf{1.2 Ciclo -- Grado}  & : [CICLO_GRADO] \\\\
    \\textbf{1.3 Docente}         & : [DOCENTE] \\\\
\\end{tabular}

\\vspace{0.5cm}

\\noindent \\textbf{II. SECUENCIA DIDÁCTICA}

\\vspace{0.2cm}

\\noindent
\\begin{tabularx}{\\textwidth}{|p{2cm}|p{3cm}|L|p{3cm}|}
    \\hline
    \\multicolumn{2}{|c|}{\\textbf{Momentos}} & \\multicolumn{1}{c|}{\\textbf{Estrategias}} & \\multicolumn{1}{c|}{\\textbf{Materiales}} \\\\
    \\hline

    \\multirow{4}{*}{\\textbf{Inicio}} 
    & \\textbf{Motivación} 
    & [MOTIVACION]
    & \\multirow{4}{*}{\\parbox{\\linewidth}{
        [MATERIALES_INICIO]
    }} \\\\
    \\cline{2-3}

    & \\textbf{Saberes previos} 
    & [SABERES_PREVIOS]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Conflicto cognitivo} 
    & [CONFLICTO_COGNITIVO]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Propósito} 
    & [PROPOSITO]
    & \\\\ 
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Desarrollo}} 
    & [ESTRATEGIAS_DESARROLLO]
    & [MATERIALES_DESARROLLO] \\\\
    \\hline
    \\multicolumn{2}{|l|}{\\textbf{Cierre}} 
    & [ESTRATEGIAS_CIERRE]
    & [MATERIALES_CIERRE] \\\\
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Tarea}} 
    & [ACTIVIDADES_CASA]
    & [MATERIALES_CASA] \\\\
    \\hline

\\end{tabularx}

\\end{document}`;

export const Templates = {
  minedu: LATEX_TEMPLATE,
  compacto: LATEX_TEMPLATE,
  rural: LATEX_TEMPLATE,
};
```

## File: `index.html`
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Aula Express</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            colors: {
              primary: '#2563eb', // Blue 600
              secondary: '#4f46e5', // Indigo 600
              accent: '#0ea5e9', // Sky 500
            }
          }
        }
      }
    </script>
    <style>
      /* Hide scrollbar for clean mobile look but allow scroll */
      .no-scrollbar::-webkit-scrollbar {
          display: none;
      }
      .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
      }
      @media print {
        .no-print {
          display: none !important;
        }
        .page-break {
          page-break-before: always;
        }
        body {
          background: white;
        }
      }
    </style>
<script type="importmap">
{
  "imports": {
    "react/": "https://aistudiocdn.com/react@^19.2.1/",
    "react": "https://aistudiocdn.com/react@^19.2.1",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.1/",
    "lucide-react": "https://aistudiocdn.com/lucide-react@^0.556.0",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.31.0"
  }
}
</script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
</body>
</html>
```

## File: `index.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## File: `metadata.json`
```json
{
  "name": "Aula Express",
  "description": "Generador de sesiones de aprendizaje ultra-rápido para docentes peruanos.",
  "requestFramePermissions": [
    "microphone"
  ]
}
```

## File: `prompts\index.ts`
```ts
import maestro from './prompt_maestro';
import inicial from './prompt_inicial';
import primaria from './prompt_primaria';
import secundaria from './prompt_secundaria';
import fichas from './prompt_fichas';
import recursos from './prompt_recursos';
import imagenes from './prompt_imagenes';
import diagramas from './prompt_diagramas';

// Type definitions for the prompt structures to ensure type safety
export interface PromptBase {
    // Maestro
    role?: string;
    task?: string;
    style?: string;
    structure?: string;
    constraints?: string[];

    // Level blocks
    focus?: string;
    materials?: string;
    tone?: string;
    gradeRules?: string[];

    // Feature instructions
    instruction?: string;

    // Second flow prompts (builders)
    inputContract?: string;
    outputContract?: string;
    guidelines?: string[];
    examples?: string[];
}

// Export the raw JSONs wrapped in a typed object
export const Prompts = {
    maestro: maestro as PromptBase,
    inicial: inicial as PromptBase,
    primaria: primaria as PromptBase,
    secundaria: secundaria as PromptBase,
    fichas: fichas as PromptBase,
    recursos: recursos as PromptBase,

    // New: second pipeline prompt blueprints
    imagenes: imagenes as PromptBase,
    diagramas: diagramas as PromptBase,
};

```

## File: `prompts\prompt_diagramas.ts`
```ts
export default {
    instruction: [
        "Prompt de soporte para el FLUJO B (generación de diagramas Mermaid).",
        "Genera código Mermaid robusto y compatible con DiagramRenderer."
    ].join(" "),

    inputContract: [
        "Recibirás un objeto con:",
        "{",
        "  nivel, grado, area,",
        "  sectionKey,",
        "  sectionText: string[],",
        "  diagramTitle: string,",
        "  diagramType?: string",
        "}"
    ].join("\n"),

    outputContract: [
        "Devuelve SOLO JSON válido:",
        "{",
        "  organizer: {",
        "    id, title, type, mermaidCode, description, textFallback",
        "  }",
        "}"
    ].join("\n"),

    guidelines: [
        "El mermaidCode debe iniciar con 'graph TD' o 'mindmap' en la primera línea.",
        "Asegura que los textos de nodos estén entre comillas dobles.",
        "No uses HTML, links, ni etiquetas peligrosas.",
        "Crea nodos cortos y legibles para proyección en aula.",
        "Incluye un textFallback que refleje la misma estructura.",
        "Si diagramType no viene, elige el más adecuado al contenido de la sección."
    ],

    examples: [
        "graph TD",
        "A[\"Concepto central\"] --> B[\"Idea 1\"]",
        "A --> C[\"Idea 2\"]"
    ]
};

```

## File: `prompts\prompt_fichas.ts`
```ts
export default {
  instruction: [
    "Genera dos fichas de aplicación distintas:",
    "1) Ficha de Aula (trabajo guiado individual o grupal).",
    "2) Ficha de Casa (refuerzo o extensión).",
    "Deben ser claras, listas para imprimir y coherentes con la sesión.",
    "Usa encabezados internos en texto cuando ayuden a organizar por subtemas.",
    "Incluye instrucciones breves y criterios de logro simples."
  ].join(" ")
};

```

## File: `prompts\prompt_imagenes.ts`
```ts
export default {
    instruction: [
        "Prompt de soporte para el FLUJO B (generación de imágenes).",
        "Tu tarea es convertir contexto pedagógico en prompts de imagen de alta calidad."
    ].join(" "),

    inputContract: [
        "Recibirás un objeto con:",
        "{",
        "  nivel, grado, area,",
        "  sectionKey,",
        "  sectionText: string[],",
        "  materials: string[],",
        "  imageRefs: [{ title, moment, existingPrompt? }]",
        "}"
    ].join("\n"),

    outputContract: [
        "Devuelve SOLO JSON válido:",
        "{",
        "  images: [",
        "    { id, title, moment, prompt }",
        "  ]",
        "}"
    ].join("\n"),

    guidelines: [
        "Respeta el nivel: más lúdico y simple en Inicial, más concreto en Primaria, más analítico en Secundaria.",
        "El título debe ser idéntico al recibido si ya existe.",
        "El prompt debe ser específico y visualmente didáctico.",
        "Incluye la línea literal: 'Text inside the image must be in Spanish'.",
        "Evita marcas registradas y rostros de personas reales identificables.",
        "Si el material sugiere una imagen externa real muy específica, crea una versión genérica educativa."
    ],

    examples: [
        "Ejemplo de estilo de prompt:",
        "Ilustración educativa limpia y clara de ...; etiquetas simples; fondo neutro;",
        "Text inside the image must be in Spanish."
    ]
};

```

## File: `prompts\prompt_inicial.ts`
```ts
export default {
  focus: [
    "Aprendizaje por juego, exploración sensorial, movimiento y comunicación oral.",
    "Rutinas simples, consignas cortas y aprendizaje vivencial."
  ].join(" "),

  materials: [
    "Materiales grandes, coloridos, manipulables y seguros del entorno inmediato.",
    "Incluye recursos visuales simples y lúdicos.",
    "Si sugieres recursos virtuales, descríbelos como apoyos para proyectar."
  ].join(" "),

  tone: [
    "Muy lúdico, cariñoso, paciente, con lenguaje sencillo.",
    "Evita tecnicismos excesivos."
  ].join(" "),

  gradeRules: [
    "En 'propositoDidactico' incluye solo un propósito.",
    "El propósito debe describir un producto observable adecuado a Inicial.",
    "Incorpora al menos una estrategia de movimiento o juego guiado.",
    "En materiales prioriza 'IMG_GEN' solo si el pedido es narrativo, creativo o de alto valor visual.",
    "Para temas muy reales o específicos, prefiere material concreto del aula y descripciones sin URLs inventadas."
  ]
};

```

## File: `prompts\prompt_maestro.ts`
```ts
export default {
  role: [
    "Eres un experto pedagogo peruano y diseñador instruccional especializado en tecnología educativa.",
    "Conoces el CNEB y prácticas didácticas actuales para Inicial, Primaria y Secundaria."
  ].join(" "),

  task: [
    "Crear una Sesión de Aprendizaje completa en JSON estricto, alineada a MINEDU.",
    "Debes preparar el contenido para un sistema de dos flujos:",
    "(A) generación del JSON textual,",
    "(B) un pipeline separado que generará/insertará recursos visuales y audiovisuales."
  ].join(" "),

  style: [
    "Redacción clara, accionable y orientada a aula real.",
    "Evita relleno, prioriza pasos concretos.",
    "Cuando menciones imágenes generadas, integra el marcador {{imagen:Título Exacto}} dentro de la estrategia donde se usa.",
    "No traduzcas nombres del área/grado."
  ].join(" "),

  structure: [
    "Salida OBLIGATORIA en JSON válido y completo según el esquema de la app.",
    "Incluye la sección 'resources' con:",
    "organizer (Mermaid) e images (prompts de imagen).",
    "Además, en 'materiales' de cada momento, lista recursos por sección usando convenciones parseables."
  ].join(" "),

  constraints: [
    // Identidad de docente
    "El 'teacherName' debe ser exactamente '___________'.",

    // Robustez de IDs (mitiga 5.2 aunque el schema aún no lo exija)
    "Siempre incluye 'id' en resources.organizer y en cada objeto de resources.images.",
    "Usa ids estables y breves tipo: org-<tema-corto> y img-<momento>-<slug>.",

    // Títulos sincronizados (mitiga 5.3)
    "Todo título de imagen en resources.images debe coincidir EXACTAMENTE con el título usado en {{imagen:Título Exacto}}.",
    "No uses sinónimos ni variaciones de artículos en esos títulos.",

    // URLs y Recursos Externos
    "Si el docente pide un recurso externo (video/foto) y NO tienes la URL exacta:",
    "Usa el formato: 'VID_YT: Título :: SEARCH: consulta' o 'IMG_URL: Título :: SEARCH: consulta'.",
    "NO inventes URLs falsas. Delega la búsqueda al sistema usando 'SEARCH:'.",

    // Materiales por sección: convención para el segundo flujo
    "En inicio.materiales, desarrollo.materiales, cierre.materiales y tareaCasa.materiales usa estos prefijos cuando aplique:",
    "1) 'IMG_GEN: <Título Exacto>' para referenciar una imagen a generar (debe existir en resources.images).",
    "2) 'VID_YT: <Título> :: SEARCH: <consulta>' para videos de YouTube.",
    "3) 'IMG_URL: <Título> :: SEARCH: <consulta>' para imágenes reales externas.",
    "4) 'DIAG_PROMPT: <Título> :: <instrucción breve>' para solicitar un diagrama adicional.",

    // Mermaid base
    "El organizador visual en resources.organizer debe resumir el tema central de toda la sesión.",
    "El mermaidCode no debe incluir HTML ni scripts.",

    // Coherencia didáctica
    "No hagas listas genéricas; contextualiza al área, grado y pedido docente.",
    "Mantén coherencia entre propósito, estrategias, materiales y fichas."
  ]
};
```

## File: `prompts\prompt_primaria.ts`
```ts
export default {
  focus: [
    "Construcción activa del conocimiento con material concreto y situaciones vivenciales.",
    "Trabajo colaborativo, preguntas guiadas y metacognición simple."
  ].join(" "),

  materials: [
    "Material estructurado y no estructurado del entorno, impresos, manipulativos y recursos digitales breves.",
    "Incluye al menos un organizador visual que el estudiante pueda copiar o adaptar en cuaderno."
  ].join(" "),

  tone: [
    "Motivador, reflexivo y participativo.",
    "Instrucciones claras y ejemplos sencillos."
  ].join(" "),

  gradeRules: [
    "En 'propositoDidactico' incluye solo un propósito.",
    "El propósito debe estar formulado como producto claro del estudiante.",
    "Incluye materiales específicos por sección usando los prefijos indicados (IMG_GEN, DIAG_PROMPT, etc.).",
    "Puedes sugerir imágenes generadas tanto para temas reales como creativos si cumplen función didáctica clara.",
    "Si mencionas un recurso externo, evita URL salvo certeza total."
  ]
};

```

## File: `prompts\prompt_recursos.ts`
```ts
export default {
    instruction: [
        "RECURSOS VIRTUALES PARA DOS FLUJOS:",
        "Este prompt se usa en el flujo A (texto). El flujo B generará imágenes/diagramas y resolverá enlaces externos.",
        "",
        "1) IMÁGENES GENERADAS POR IA (resources.images):",
        "- Genera entre 2 y 4 imágenes ilustradas si el tema lo amerita.",
        "- Cada imagen debe incluir: id, title, prompt, moment.",
        "- El 'moment' debe ser exactamente uno de: 'Inicio', 'Desarrollo', 'Cierre'.",
        "- El 'prompt' debe ser detallado y apto para un modelo de imagen IA.",
        "- Incluye explícitamente: 'Text inside the image must be in Spanish'.",
        "",
        "2) SINCRONIZACIÓN CON TEXTO:",
        "- Cuando una estrategia mencione usar una imagen generada, inserta {{imagen:Título Exacto}}.",
        "- El título debe coincidir EXACTAMENTE con resources.images[].title.",
        "",
        "3) ORGANIZADOR MERMAID (resources.organizer):",
        "- Incluye id, title, type y mermaidCode.",
        "- Usa 'graph TD' o 'mindmap' en la PRIMERA línea.",
        "- Los nodos deben usar comillas dobles en los textos.",
        "",
        "════════════════════════════════════════════════════════════",
        "4) MATERIALES POR SECCIÓN - ¡MUY IMPORTANTE!",
        "════════════════════════════════════════════════════════════",
        "En inicio.materiales, desarrollo.materiales, cierre.materiales, tareaCasa.materiales",
        "DEBES incluir ítems con estos PREFIJOS EXACTOS cuando corresponda:",
        "",
        "👉 IMG_GEN: <Título Exacto>",
        "   Referencia a una imagen IA que debe existir en resources.images.",
        "",
        "👉 VID_YT: <Título descriptivo> :: SEARCH: <consulta de búsqueda>",
        "   Para videos de YouTube. El sistema buscará el video real.",
        "   Ejemplo: VID_YT: Canción de las Vocales :: SEARCH: cancion infantil vocales español",
        "",
        "👉 IMG_URL: <Título descriptivo> :: SEARCH: <consulta de búsqueda>",
        "   Para FOTOS REALES (no ilustraciones). El sistema buscará la imagen.",
        "   Ejemplo: IMG_URL: Foto de Elefante Real :: SEARCH: elefante africano foto real",
        "",
        "👉 DIAG_PROMPT: <Título> :: <instrucción breve>",
        "   Para solicitar un diagrama adicional por sección.",
        "",
        "⚠️ NUNCA inventes URLs. Usa siempre el formato SEARCH: para que el sistema busque.",
        "⚠️ Si el docente pide videos o fotos reales, DEBES usar VID_YT o IMG_URL con SEARCH."
    ].join("\n")
};


```

## File: `prompts\prompt_secundaria.ts`
```ts
export default {
  focus: [
    "Pensamiento crítico, indagación, análisis de fuentes, argumentación y autonomía.",
    "Discusión, síntesis y aplicación en contextos reales."
  ].join(" "),

  materials: [
    "Recursos tecnológicos, textos breves, datos, estudios de caso y organizadores visuales más complejos.",
    "Incluye materiales digitales listos para proyectar o analizar en aula."
  ].join(" "),

  tone: [
    "Retador y académico pero accesible.",
    "Fomenta ciudadanía, rigor y reflexión."
  ].join(" "),

  gradeRules: [
    "En 'propositoDidactico' incluye uno o dos propósitos coherentes con el tema.",
    "Cada propósito debe conectar con evidencia de aprendizaje o un organizador visual.",
    "Añade materiales por sección con prefijos parseables.",
    "Evita URLs inventadas; solo usa enlaces si son totalmente verificables.",
    "Puedes proponer imágenes generadas si representan modelos, esquemas o visualizaciones didácticas generales."
  ]
};

```

## File: `schemas\sessionSchema.ts`
```ts
import { Type, Schema } from "@google/genai";

export const SESSION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sessionTitle: { type: Type.STRING, description: "Título creativo y corto de la sesión." },
    area: { type: Type.STRING },
    cycleGrade: { type: Type.STRING },
    teacherName: { type: Type.STRING, description: "Usar '___________' como placeholder." },
    inicio: {
      type: Type.OBJECT,
      properties: {
        motivacion: { type: Type.ARRAY, items: { type: Type.STRING } },
        saberesPrevios: { type: Type.ARRAY, items: { type: Type.STRING } },
        conflictoCognitivo: { type: Type.ARRAY, items: { type: Type.STRING } },
        propositoDidactico: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["motivacion", "saberesPrevios", "conflictoCognitivo", "propositoDidactico", "materiales"],
    },
    desarrollo: {
      type: Type.OBJECT,
      properties: {
        estrategias: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["estrategias", "materiales"],
    },
    cierre: {
      type: Type.OBJECT,
      properties: {
        estrategias: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["estrategias", "materiales"],
    },
    tareaCasa: {
      type: Type.OBJECT,
      properties: {
        actividades: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["actividades", "materiales"],
    },
    fichas: {
      type: Type.OBJECT,
      properties: {
        aula: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            instrucciones: { type: Type.ARRAY, items: { type: Type.STRING } },
            items: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["titulo", "instrucciones", "items"],
        },
        casa: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            instrucciones: { type: Type.ARRAY, items: { type: Type.STRING } },
            items: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["titulo", "instrucciones", "items"],
        },
      },
      required: ["aula", "casa"],
    },
    resources: {
        type: Type.OBJECT,
        description: "Recursos virtuales para proyectar en clase.",
        properties: {
            organizer: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, description: "Uno de: mapa-conceptual, mapa-mental, espina-pescado, cuadro-sinoptico, linea-tiempo, diagrama-flujo, diagrama-venn, cruz-esquematica, cuadro-comparativo, arbol-ideas" },
                    mermaidCode: { type: Type.STRING, description: "Código Mermaid graph TD o mindmap. IMPORTANTE: 1. Textos de nodos entre comillas dobles. 2. 'graph TD' debe estar en su propia línea." },
                    description: { type: Type.STRING, description: "Breve explicación del gráfico." },
                    textFallback: { type: Type.STRING, description: "Versión texto plano del gráfico por si falla el render." }
                },
                required: ["id", "title", "type", "mermaidCode", "description"]
            },
            images: {
                type: Type.ARRAY,
                description: "Lista de 2 a 3 imágenes clave para generar.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        prompt: { type: Type.STRING, description: "Prompt descriptivo en inglés optimizado para generar la imagen (fotorealista o ilustración según nivel)." },
                        moment: { type: Type.STRING, description: "Inicio, Desarrollo o Cierre" }
                    },
                    required: ["id", "title", "prompt", "moment"]
                }
            },
            diagrams: {
                type: Type.ARRAY,
                description: "Lista de diagramas adicionales generados por solicitud en materiales.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        type: { type: Type.STRING },
                        mermaidCode: { type: Type.STRING },
                        description: { type: Type.STRING },
                        textFallback: { type: Type.STRING }
                    },
                    required: ["id", "title", "type", "mermaidCode"]
                }
            }
        },
        required: ["organizer", "images"]
    }
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas", "resources"],
};

```

## File: `services\exportService.ts`
```ts
export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function printSession() {
  window.print();
}
```

## File: `services\geminiService.ts`
```ts
import { GoogleGenAI } from "@google/genai";

// SECURITY NOTE:
// The API key is obtained exclusively from the environment variable process.env.API_KEY.
// Do NOT hardcode your API key here. If you hardcode it, Google scanners may detect it,
// flag it as leaked, and revoke it, causing 403 errors.

const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.warn("Aula Express: process.env.API_KEY is missing. Session generation will fail.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export { ai };
```

## File: `types.ts`
```ts
export interface SessionBlock {
  motivacion?: string[];
  saberesPrevios?: string[];
  conflictoCognitivo?: string[];
  propositoDidactico?: string[];
  estrategias?: string[];
  actividades?: string[];
  materiales?: string[];
}

export interface FichaContent {
  titulo: string;
  instrucciones: string[];
  items: string[];
}

export type OrganizerType =
  | 'mapa-conceptual'
  | 'mapa-mental'
  | 'espina-pescado'
  | 'cuadro-sinoptico'
  | 'linea-tiempo'
  | 'diagrama-flujo'
  | 'diagrama-venn'
  | 'cruz-esquematica'
  | 'cuadro-comparativo'
  | 'arbol-ideas'
  | 'otro';

export interface Organizer {
  id: string;
  title: string;
  type: OrganizerType;
  mermaidCode: string; // The code to render
  description: string;
  textFallback?: string; // Fallback if render fails
  notes?: string;
}

export interface GeneratedImage {
  id: string;
  title: string;
  prompt: string; // The prompt used to generate it
  moment: 'Inicio' | 'Desarrollo' | 'Cierre';
  base64Data?: string; // The actual generated image
  isLoading?: boolean;
  error?: string; // Error message if generation failed
}

export interface VirtualResources {
  organizer: Organizer;
  images: GeneratedImage[];
  diagrams?: Organizer[]; // Refactor: Support for additional diagrams
}

// Callback for progressive resource updates (non-blocking flow)
export type ResourceUpdateCallback = (
  type: 'image' | 'diagram' | 'section_update',
  resourceId: string,
  data: GeneratedImage | Organizer | { section: keyof SessionData, field: string, value: string[] }
) => void;

export interface SessionData {
  sessionTitle: string;
  area: string;
  cycleGrade: string;
  teacherName: string;
  inicio: {
    motivacion: string[];
    saberesPrevios: string[];
    conflictoCognitivo: string[];
    propositoDidactico: string[];
    materiales: string[];
  };
  desarrollo: {
    estrategias: string[];
    materiales: string[];
  };
  cierre: {
    estrategias: string[];
    materiales: string[];
  };
  tareaCasa: {
    actividades: string[];
    materiales: string[];
  };
  fichas: {
    aula: FichaContent;
    casa: FichaContent;
  };
  resources: VirtualResources;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  data: SessionData;
  preview: string;
}

export interface SessionRequest {
  nivel: string;
  grado: string;
  area: string;
  prompt: string;
}

export type FormatPackId = 'minedu' | 'compacto' | 'rural';

export interface FormatPack {
  id: FormatPackId;
  name: string;
  description: string;
  template: string;
}
```

## File: `utils\markdownParser.tsx`
```tsx
import React from 'react';

/**
 * Parse basic markdown syntax and return React elements
 * Supports: **bold**, *italic*, `code`, and combinations
 */
export function parseMarkdown(text: string): React.ReactNode {
    if (!text) return null;

    // Split by markdown patterns and create React elements
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex to match **bold**, *italic*, `code`
    const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let match;
    let key = 0;

    while ((match = pattern.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const fullMatch = match[1];

        if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
            // Bold text
            const content = match[2];
            parts.push(<strong key={key++} className="font-bold text-slate-900">{content}</strong>);
        } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && !fullMatch.startsWith('**')) {
            // Italic text
            const content = match[3];
            parts.push(<em key={key++} className="italic">{content}</em>);
        } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
            // Code text
            const content = match[4];
            parts.push(<code key={key++} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">{content}</code>);
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

/**
 * Component to render markdown text
 */
export const MarkdownText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
    return <span className={className}>{parseMarkdown(text)}</span>;
};

/**
 * Check if an item looks like a section header (starts with ** or is all caps)
 */
export function isHeaderItem(item: string): boolean {
    return item.startsWith('**') && item.endsWith('**') ||
        item === item.toUpperCase() && item.length > 3;
}

/**
 * Group items by headers for better display
 * Returns grouped structure with headers and their sub-items
 */
export interface GroupedItems {
    header: string | null;
    items: string[];
}

export function groupItemsByHeaders(items: string[]): GroupedItems[] {
    const groups: GroupedItems[] = [];
    let currentGroup: GroupedItems = { header: null, items: [] };

    for (const item of items) {
        // Check if this item is a header (wrapped in ** or looks like a group header)
        const isHeader = (item.startsWith('**') && item.endsWith('**')) ||
            (item.includes(':') && item.split(':')[0].startsWith('**'));

        if (isHeader) {
            // Save previous group if it has items
            if (currentGroup.items.length > 0 || currentGroup.header) {
                groups.push(currentGroup);
            }
            // Start new group with this header
            currentGroup = {
                header: item.replace(/\*\*/g, ''), // Remove ** from header
                items: []
            };
        } else if (item.trim()) {
            // Add non-empty item to current group
            currentGroup.items.push(item);
        }
    }

    // Don't forget the last group
    if (currentGroup.items.length > 0 || currentGroup.header) {
        groups.push(currentGroup);
    }

    return groups;
}

// ============================================================
// EXTERNAL RESOURCE RENDERING (VID_YT, IMG_URL, IMG_GEN, DIAG_PROMPT)
// ============================================================

interface ParsedResource {
    type: 'VID_YT' | 'IMG_URL' | 'IMG_GEN' | 'DIAG_PROMPT' | 'TEXT';
    title: string;
    url?: string;
    instruction?: string;
}

/**
 * Parse a material item to detect resource prefixes
 */
export function parseResourceItem(item: string): ParsedResource {
    // VID_YT: Título :: URL
    const vidMatch = item.match(/^VID_YT:\s*(.+?)\s*::\s*(.+)$/i);
    if (vidMatch) {
        return { type: 'VID_YT', title: vidMatch[1].trim(), url: vidMatch[2].trim() };
    }

    // IMG_URL: Título :: URL
    const imgUrlMatch = item.match(/^IMG_URL:\s*(.+?)\s*::\s*(.+)$/i);
    if (imgUrlMatch) {
        return { type: 'IMG_URL', title: imgUrlMatch[1].trim(), url: imgUrlMatch[2].trim() };
    }

    // IMG_GEN: Título
    const imgGenMatch = item.match(/^IMG_GEN:\s*(.+)$/i);
    if (imgGenMatch) {
        return { type: 'IMG_GEN', title: imgGenMatch[1].trim() };
    }

    // DIAG_PROMPT: Título :: Instrucción
    const diagMatch = item.match(/^DIAG_PROMPT:\s*(.+?)\s*::\s*(.+)$/i);
    if (diagMatch) {
        return { type: 'DIAG_PROMPT', title: diagMatch[1].trim(), instruction: diagMatch[2].trim() };
    }

    // Default: plain text
    return { type: 'TEXT', title: item };
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Component to render external resources (YouTube videos, images, etc.)
 */
export const ExternalResourceRenderer: React.FC<{ item: string }> = ({ item }) => {
    const resource = parseResourceItem(item);

    switch (resource.type) {
        case 'VID_YT': {
            const videoId = resource.url ? getYouTubeVideoId(resource.url) : null;
            if (videoId) {
                return (
                    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <div className="aspect-video w-full">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={resource.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                        <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                            <span className="text-xs font-bold text-red-600 mr-2">▶ YouTube</span>
                            <span className="text-sm text-slate-700">{resource.title}</span>
                        </div>
                    </div>
                );
            }
            // Fallback: show link if can't extract video ID
            return (
                <div className="my-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-xs font-bold text-red-600 mr-2">▶ Video:</span>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {resource.title}
                    </a>
                </div>
            );
        }

        case 'IMG_URL': {
            return (
                <div className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                        src={resource.url}
                        alt={resource.title}
                        className="w-full max-h-80 object-contain bg-white"
                        onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <div className="px-3 py-2 bg-blue-50 border-t border-blue-100">
                        <span className="text-xs font-bold text-blue-600 mr-2">🖼️ Imagen</span>
                        <span className="text-sm text-slate-700">{resource.title}</span>
                    </div>
                </div>
            );
        }

        case 'IMG_GEN': {
            return (
                <div className="my-2 p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-600">✨ Imagen IA:</span>
                    <span className="text-sm text-slate-700">{resource.title}</span>
                    <span className="text-xs text-slate-400">(ver en Presentación)</span>
                </div>
            );
        }

        case 'DIAG_PROMPT': {
            return (
                <div className="my-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-600 mr-2">📊 Diagrama:</span>
                    <span className="text-sm text-slate-700">{resource.title}</span>
                    <p className="text-xs text-slate-500 mt-1">{resource.instruction}</p>
                </div>
            );
        }

        default:
            // Regular text - use markdown parser
            return <MarkdownText text={item} />;
    }
};

/**
 * Check if a material item is an external resource
 */
export function isExternalResource(item: string): boolean {
    return /^(VID_YT|IMG_URL|IMG_GEN|DIAG_PROMPT):/i.test(item);
}

```

## File: `utils\normalization.ts`
```ts
export function slugify(text: string): string {
  if (!text) return 'untitled';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTitle(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:]$/g, ''); // Remove trailing punctuation
}

export function fuzzyMatchImage(
    ref: string, 
    images: { title: string; id: string }[] | undefined
): { title: string; id: string } | undefined {
    if (!images || images.length === 0) return undefined;
    
    const normRef = normalizeTitle(ref);
    if (!normRef) return undefined;
    
    // 1. Exact match (normalized)
    const exact = images.find(img => normalizeTitle(img.title) === normRef);
    if (exact) return exact;

    // 2. Fuzzy match (contains)
    const fuzzy = images.find(img => {
        const normImg = normalizeTitle(img.title);
        return normImg && (normImg.includes(normRef) || normRef.includes(normImg));
    });
    
    return fuzzy;
}

```

## File: `vite.config.ts`
```ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

```
