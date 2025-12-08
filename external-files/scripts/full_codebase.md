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
│   ├── prompt_fichas.json
│   ├── prompt_inicial.json
│   ├── prompt_maestro.json
│   ├── prompt_primaria.json
│   ├── prompt_recursos.json
│   ├── prompt_recursos_resolver.json
│   └── prompt_secundaria.json
├── schemas
│   ├── resolvedResourceSchema.ts
│   └── sessionSchema.ts
├── services
│   ├── ResourceResolver.ts
│   ├── exportService.ts
│   └── geminiService.ts
├── tsconfig.json
├── types.ts
├── utils
│   └── markdownParser.tsx
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
import React, { useState } from 'react';
import Home from './components/Home';
import SessionResult from './components/SessionResult';
import ResourcesPresenter from './components/ResourcesPresenter';
import { SessionData, ResolvedResource } from './types';

type ViewState = 'home' | 'result' | 'resources';

interface SessionContext {
  data: SessionData;
  nivel: string;
  resourceResolutionPromise?: Promise<ResolvedResource[]>;
}

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);

  const handleSessionGenerated = (data: SessionData, nivel?: string, resourcePromise?: Promise<ResolvedResource[]>) => {
    setSessionContext({ data, nivel: nivel || 'Primaria', resourceResolutionPromise: resourcePromise });
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
          resourceResolutionPromise={sessionContext.resourceResolutionPromise}
          onBack={handleBackToResult}
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
            const cleanCode = organizer.mermaidCode
                .trim()
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"');

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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NIVELES, GRADOS_INICIAL, GRADOS_PRIMARIA, GRADOS_SECUNDARIA, AREAS } from '../constants';
import { SessionGenerator } from '../core/SessionGenerator';
import { ResourceResolver } from '../services/ResourceResolver';
import { SessionData, ResolvedResource, SessionRequest, SessionRecord } from '../types';
import { Mic, MicOff, Loader2, Sparkles, History, ArrowRight, Camera, X, Image as ImageIcon, Upload } from 'lucide-react';

interface HomeProps {
    onSessionGenerated: (data: SessionData, nivel?: string, resourcePromise?: Promise<ResolvedResource[]>) => void;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated }) => {
    const [nivel, setNivel] = useState(NIVELES[1]);
    const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
    const [area, setArea] = useState(AREAS[0]);
    const [prompt, setPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Generando sesión...');
    const [history, setHistory] = useState<SessionRecord[]>([]);

    // Image state
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showImageOptions, setShowImageOptions] = useState(false);

    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

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

        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.lang = 'es-PE';
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    setPrompt(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                if (isListening) {
                    // Auto-restart if still supposed to be listening
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        setIsListening(false);
                    }
                }
            };
        }
    }, []);

    const toggleMic = () => {
        if (!recognitionRef.current) {
            alert("Tu navegador no soporta dictado por voz. Prueba con Chrome o Edge.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('Failed to start recognition:', e);
                setIsListening(false);
            }
        }
    };

    // Image handling
    const handleImageSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida.');
            return;
        }

        // Limit file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es muy grande. Máximo 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1]; // Remove data:image/xxx;base64, prefix
            setImageBase64(base64Data);
            setImageMimeType(file.type);
            setImagePreview(base64);
            setShowImageOptions(false);

            // Add descriptive prompt if empty
            if (!prompt.trim()) {
                setPrompt('Crea una sesión basada en esta imagen del libro/material didáctico');
            }
        };
        reader.readAsDataURL(file);
    }, [prompt]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageSelect(file);
        e.target.value = ''; // Reset input
    };

    const removeImage = () => {
        setImageBase64(null);
        setImageMimeType(null);
        setImagePreview(null);
    };

    const handleSubmit = async () => {
        if (!prompt.trim() && !imageBase64) return;

        // Stop listening if active
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        setLoading(true);
        setLoadingText(imageBase64 ? "Analizando imagen..." : "Interpretando pedido...");

        const messages = imageBase64
            ? ["Procesando contenido visual...", "Extrayendo información...", "Estructurando momentos...", "Diseñando estrategias...", "Creando fichas..."]
            : ["Estructurando momentos...", "Diseñando estrategias...", "Creando fichas...", "Aplicando formato..."];

        let msgIdx = 0;
        const interval = setInterval(() => {
            setLoadingText(messages[msgIdx % messages.length]);
            msgIdx++;
        }, 2500);

        try {
            const request: SessionRequest = {
                nivel,
                grado,
                area,
                prompt: prompt || 'Crea una sesión basada en la imagen proporcionada',
                imageBase64: imageBase64 || undefined,
                imageMimeType: imageMimeType || undefined
            };

            const data = await SessionGenerator.generate(request);

            // SECOND LLM CALL: Resolve resources with direct URLs
            if (data.recursos && data.recursos.length > 0) {
                setLoadingText("Buscando recursos educativos...");
                try {
                    const resolved = await SessionGenerator.resolveResourcesWithLLM(
                        data.recursos,
                        data.sessionTitle,
                        nivel
                    );

                    // Merge resolved URLs back into recursos
                    if (resolved.resolvedResources) {
                        data.recursos = data.recursos.map(resource => {
                            const resolvedItem = resolved.resolvedResources.find(
                                (r: any) => r.id === resource.id
                            );
                            if (resolvedItem) {
                                return {
                                    ...resource,
                                    source: {
                                        ...resource.source,
                                        resolvedUrl: resolvedItem.resolvedUrl,
                                        thumbnailUrl: resolvedItem.thumbnailUrl,
                                        sourceName: resolvedItem.sourceName
                                    }
                                };
                            }
                            return resource;
                        });
                    }
                } catch (error) {
                    console.error('Failed to resolve resources with LLM:', error);
                    // Continue without resolved URLs
                }
            }

            const newRecord: SessionRecord = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                data,
                preview: data.sessionTitle
            };
            const newHistory = [newRecord, ...history].slice(0, 3);
            setHistory(newHistory);
            localStorage.setItem('aula_history', JSON.stringify(newHistory));

            // Start resolving resources immediately (prefetching / Instagram trick)
            const resourcePromise = ResourceResolver.resolveAll(data.recursos || [], nivel);

            clearInterval(interval);
            onSessionGenerated(data, nivel, resourcePromise);
        } catch (error) {
            clearInterval(interval);
            alert("Hubo un error. Por favor intenta de nuevo.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadFromHistory = (record: SessionRecord) => {
        onSessionGenerated(record.data, 'Primaria'); // History doesn't store nivel, use default
    };

    const getGrades = () => {
        if (nivel === 'Inicial') return GRADOS_INICIAL;
        if (nivel === 'Secundaria') return GRADOS_SECUNDARIA;
        return GRADOS_PRIMARIA;
    };

    const canSubmit = (prompt.trim() || imageBase64) && !loading;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 flex flex-col items-center p-4 pb-8">
            <div className="w-full max-w-lg space-y-6 mt-4 sm:mt-8">

                {/* Header - Mobile optimized */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-2">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Aula Express</h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-base">Genera sesiones de aprendizaje en segundos</p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
                    <div className="p-5 sm:p-6 space-y-5">

                        {/* Selectors - 2 column grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nivel</label>
                                <select
                                    value={nivel}
                                    onChange={(e) => setNivel(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Grado</label>
                                <select
                                    value={grado}
                                    onChange={(e) => setGrado(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    {getGrades().map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Area - Full width */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Área Curricular</label>
                            <select
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-blue-200 bg-blue-50">
                                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                                <button
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    Imagen adjunta
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                {imagePreview ? '¿Qué quieres hacer con esta imagen?' : '¿Qué quieres enseñar hoy?'}
                            </label>
                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={imagePreview
                                        ? "Ej: Crea una sesión basada en esta teoría del libro..."
                                        : "Ej: La decena con juegos para niños de 6 años..."}
                                    className={`block w-full p-4 pb-16 text-base text-slate-900 bg-slate-50 rounded-2xl border-2 focus:ring-0 focus:border-blue-500 resize-none h-36 transition-all ${isListening ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                                        }`}
                                />

                                {/* Input action buttons */}
                                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                    {/* Left side - Image options */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowImageOptions(!showImageOptions)}
                                            className={`p-2.5 rounded-xl transition-all duration-200 ${imageBase64
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>

                                        {/* Image options dropdown */}
                                        {showImageOptions && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 min-w-[180px] z-10">
                                                <button
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                >
                                                    <Camera className="w-5 h-5 text-blue-500" />
                                                    <span>Tomar foto</span>
                                                </button>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                >
                                                    <Upload className="w-5 h-5 text-indigo-500" />
                                                    <span>Subir imagen</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right side - Voice button */}
                                    <button
                                        onClick={toggleMic}
                                        className={`p-3 rounded-xl transition-all duration-200 ${isListening
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse'
                                            : 'bg-white text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Voice indicator */}
                            {isListening && (
                                <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    Escuchando... Habla ahora
                                </div>
                            )}
                        </div>

                        {/* Hidden file inputs */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${canSubmit
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/30'
                                : 'bg-slate-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6" />
                                    {loadingText}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generar Sesión
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* History Section */}
                {history.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400 px-1">
                            <History className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Recientes</span>
                        </div>
                        <div className="grid gap-3">
                            {history.map(record => (
                                <button
                                    key={record.id}
                                    onClick={() => loadFromHistory(record)}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all text-left w-full"
                                >
                                    <div>
                                        <h3 className="font-semibold text-slate-800 line-clamp-1">{record.preview}</h3>
                                        <p className="text-xs text-slate-400 mt-1">{record.data.area} • {record.data.cycleGrade}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feature hints - Mobile friendly */}
                <div className="text-center text-xs text-slate-400 space-y-1 pb-4">
                    <p>💡 <strong>Dicta</strong> tu pedido o <strong>sube una foto</strong> del libro</p>
                    <p>La IA analizará el contenido y creará la sesión</p>
                </div>
            </div>

            {/* Click outside to close image options */}
            {showImageOptions && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowImageOptions(false)}
                />
            )}
        </div>
    );
};

export default Home;
```

## File: `components\ResourcesPresenter.tsx`
```tsx
import React, { useState, useMemo, useEffect } from 'react';
import { SessionData, Resource, ResolvedResource, ResourceMoment, ResourceKind, Organizer } from '../types';
import DiagramRenderer from './DiagramRenderer';
import { ResourceResolver } from '../services/ResourceResolver';
import {
    ArrowLeft, Image, Video, FileText, Layout, BookOpen, Home as HomeIcon,
    Printer, Maximize2, Copy, ExternalLink, Sparkles, Filter, Play,
    Check, FileSpreadsheet, Loader2, Search, Download, AlertCircle
} from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';

interface ResourcesPresenterProps {
    data: SessionData;
    nivel?: string;
    resourceResolutionPromise?: Promise<ResolvedResource[]>;
    onBack: () => void;
}

// Icon mapping for resource kinds
const KIND_ICONS: Record<ResourceKind, React.ReactNode> = {
    image: <Image className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
    organizer: <Layout className="w-5 h-5" />,
    reading: <BookOpen className="w-5 h-5" />,
    worksheet: <FileSpreadsheet className="w-5 h-5" />,
    other: <FileText className="w-5 h-5" />
};

// Color mapping for moments
const MOMENT_COLORS: Record<ResourceMoment, { bg: string; text: string; border: string; gradient: string }> = {
    inicio: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
    desarrollo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-600' },
    cierre: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-600' },
    tarea: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', gradient: 'from-green-500 to-green-600' },
    general: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', gradient: 'from-slate-500 to-slate-600' }
};

// Labels for moments
const MOMENT_LABELS: Record<ResourceMoment, string> = {
    inicio: 'Inicio',
    desarrollo: 'Desarrollo',
    cierre: 'Cierre',
    tarea: 'Tarea',
    general: 'General'
};

// Labels for kinds
const KIND_LABELS: Record<ResourceKind, string> = {
    image: 'Imagen',
    video: 'Video',
    organizer: 'Organizador',
    reading: 'Lectura',
    worksheet: 'Ficha',
    other: 'Otro'
};

// Resource Card Component with resolved content
const ResourceCard: React.FC<{
    resource: ResolvedResource;
    onFullscreen?: () => void;
}> = ({ resource, onFullscreen }) => {
    const colors = MOMENT_COLORS[resource.moment];
    const isExternal = resource.source.mode === 'external';
    const isResolved = resource.status === 'resolved';
    const hasError = resource.status === 'error';
    const isPending = resource.status === 'pending';

    const handleOpenUrl = () => {
        if (resource.url) {
            window.open(resource.url, '_blank');
        }
    };

    return (
        <div className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300`}>
            {/* Resource Preview - Shows actual thumbnail */}
            <div className={`h-44 relative overflow-hidden ${!resource.thumbnail ? colors.bg : ''}`}>
                {resource.thumbnail ? (
                    <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback to placeholder on error
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-5xl opacity-20">
                            {KIND_ICONS[resource.kind]}
                        </div>
                    </div>
                )}

                {/* Status indicators */}
                {isPending && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
                {hasError && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Error
                    </div>
                )}

                {/* Mode badge */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm ${isExternal
                    ? 'bg-blue-500/90 text-white'
                    : 'bg-purple-500/90 text-white'
                    }`}>
                    {isExternal ? <ExternalLink className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {isExternal ? 'Web' : 'IA'}
                </div>

                {/* Kind badge */}
                <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium bg-white/90 ${colors.text} flex items-center gap-1 backdrop-blur-sm`}>
                    {KIND_ICONS[resource.kind]}
                    {KIND_LABELS[resource.kind]}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{resource.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {MOMENT_LABELS[resource.moment]}
                        </span>
                        {resource.attribution && (
                            <span className="text-xs text-slate-400">{resource.attribution}</span>
                        )}
                    </div>
                </div>

                {/* Notes */}
                {resource.notes && (
                    <p className="text-xs text-slate-600 line-clamp-2">{resource.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {isExternal && resource.url && (
                        <button
                            onClick={handleOpenUrl}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r ${colors.gradient} text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 shadow-sm`}
                        >
                            <Search className="w-4 h-4" />
                            Buscar en Web
                        </button>
                    )}
                    {!isExternal && resource.thumbnail && (
                        <button
                            onClick={onFullscreen}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 shadow-sm"
                        >
                            <Maximize2 className="w-4 h-4" />
                            Ver Imagen
                        </button>
                    )}
                    <button
                        onClick={onFullscreen}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Ficha Card Component
const FichaCard: React.FC<{
    type: 'aula' | 'casa';
    ficha: { titulo: string; instrucciones: string[]; items: string[] };
    onFullscreen?: () => void;
}> = ({ type, ficha, onFullscreen }) => {
    const isAula = type === 'aula';
    const colors = isAula
        ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-600' }
        : { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-500 to-orange-600' };

    const groupedItems = groupItemsByHeaders(ficha.items);

    return (
        <div className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300`}>
            <div className={`bg-gradient-to-r ${colors.gradient} text-white p-5`}>
                <div className="flex items-center gap-2 mb-2">
                    {isAula ? <BookOpen className="w-5 h-5" /> : <HomeIcon className="w-5 h-5" />}
                    <span className="text-xs font-medium opacity-80">
                        Ficha de {isAula ? 'Aplicación' : 'Extensión'}
                    </span>
                </div>
                <h3 className="font-bold text-xl">{isAula ? 'Aula' : 'Casa'}</h3>
                <p className="text-sm opacity-90 mt-1">{ficha.titulo}</p>
            </div>

            <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                {groupedItems.slice(0, 2).map((group, idx) => (
                    <div key={idx}>
                        {group.header && (
                            <p className="text-xs font-bold text-slate-700 mb-1">{group.header}</p>
                        )}
                        {group.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-slate-600 line-clamp-1">• {item}</p>
                        ))}
                        {group.items.length > 2 && (
                            <p className="text-xs text-slate-400">+{group.items.length - 2} más...</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 pt-0 flex gap-2">
                <button
                    onClick={onFullscreen}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r ${colors.gradient} text-white rounded-xl text-sm font-bold transition-all hover:opacity-90 shadow-sm`}
                >
                    <Maximize2 className="w-4 h-4" />
                    Ver completa
                </button>
                <button className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                    <Printer className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const ResourcesPresenter: React.FC<ResourcesPresenterProps> = ({ data, nivel = 'Primaria', resourceResolutionPromise, onBack }) => {
    const [activeFilter, setActiveFilter] = useState<ResourceMoment | 'all' | 'fichas'>('all');
    const [kindFilter, setKindFilter] = useState<ResourceKind | 'all'>('all');
    const [fullscreenResource, setFullscreenResource] = useState<ResolvedResource | null>(null);
    const [fullscreenFicha, setFullscreenFicha] = useState<'aula' | 'casa' | null>(null);

    // State for resolved resources
    const [resolvedResources, setResolvedResources] = useState<ResolvedResource[]>([]);
    const [isResolving, setIsResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    // Get raw resources
    const recursos = data.recursos || [];

    // Resolve resources on mount
    // Resolve resources on mount or use promise
    useEffect(() => {
        if (recursos.length === 0) return;

        const resolveResources = async () => {
            setIsResolving(true);
            setResolveError(null);

            try {
                // If we have a pre-calculated promise from Home/App, use it
                const resolved = resourceResolutionPromise
                    ? await resourceResolutionPromise
                    : await ResourceResolver.resolveAll(recursos, nivel || 'Primaria');

                setResolvedResources(resolved);
            } catch (error) {
                console.error('Failed to resolve resources:', error);
                setResolveError('Error al procesar los recursos');
                // Fallback: mark all as pending
                setResolvedResources(recursos.map(r => ({ ...r, status: 'pending' as const })));
            } finally {
                setIsResolving(false);
            }
        };

        resolveResources();
    }, [recursos, nivel, resourceResolutionPromise]);

    // Filter resolved resources
    const filteredResources = useMemo(() => {
        return resolvedResources.filter(r => {
            if (activeFilter !== 'all' && activeFilter !== 'fichas' && r.moment !== activeFilter) return false;
            if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
            return true;
        });
    }, [resolvedResources, activeFilter, kindFilter]);

    // Get unique moments and kinds for filter buttons
    const availableMoments = useMemo(() => {
        const moments = new Set(resolvedResources.map(r => r.moment));
        return Array.from(moments) as ResourceMoment[];
    }, [resolvedResources]);

    const availableKinds = useMemo(() => {
        const kinds = new Set(resolvedResources.map(r => r.kind));
        return Array.from(kinds) as ResourceKind[];
    }, [resolvedResources]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            {/* Navbar */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Volver a Sesión
                    </button>
                    <div className="flex items-center gap-3">
                        {isResolving && (
                            <div className="flex items-center gap-2 text-indigo-600 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Procesando recursos...</span>
                            </div>
                        )}
                        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {resolvedResources.length} recursos • {(data.organizadores || []).length} organizadores • 2 fichas
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Play className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Recursos para Proyectar</h1>
                            <p className="text-slate-500 text-sm">{data.sessionTitle}</p>
                        </div>
                    </div>
                    {resolveError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {resolveError}
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="mb-6 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            Todos
                        </button>
                        {availableMoments.map(moment => (
                            <button
                                key={moment}
                                onClick={() => setActiveFilter(moment)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === moment
                                    ? `bg-gradient-to-r ${MOMENT_COLORS[moment].gradient} text-white shadow-md`
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                {MOMENT_LABELS[moment]}
                            </button>
                        ))}
                        <button
                            onClick={() => setActiveFilter('fichas')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === 'fichas'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Fichas
                        </button>
                        {(data.organizadores || []).length > 0 && (
                            <button
                                onClick={() => setActiveFilter('organizadores' as any)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === 'organizadores'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                <Layout className="w-4 h-4" />
                                Organizadores
                            </button>
                        )}
                    </div>

                    {activeFilter !== 'fichas' && availableKinds.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
                                <Filter className="w-3 h-3" />
                                Tipo:
                            </span>
                            <button
                                onClick={() => setKindFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kindFilter === 'all'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {availableKinds.map(kind => (
                                <button
                                    key={kind}
                                    onClick={() => setKindFilter(kind)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${kindFilter === kind
                                        ? 'bg-slate-800 text-white'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {KIND_ICONS[kind]}
                                    {KIND_LABELS[kind]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Grid */}
                {activeFilter === 'fichas' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FichaCard
                            type="aula"
                            ficha={data.fichas.aula}
                            onFullscreen={() => setFullscreenFicha('aula')}
                        />
                        <FichaCard
                            type="casa"
                            ficha={data.fichas.casa}
                            onFullscreen={() => setFullscreenFicha('casa')}
                        />
                    </div>
                ) : activeFilter === 'organizadores' ? (
                    <div className="space-y-6">
                        {(data.organizadores || []).map((organizer, idx) => (
                            <DiagramRenderer
                                key={organizer.id || idx}
                                organizer={organizer}
                                className=""
                            />
                        ))}
                        {(data.organizadores || []).length === 0 && (
                            <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                                <Layout className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-lg">No hay organizadores visuales</p>
                                <p className="text-sm mt-2">Las sesiones nuevas incluirán organizadores con diagramas automáticamente</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredResources.map((resource, idx) => (
                            <ResourceCard
                                key={resource.id || idx}
                                resource={resource}
                                onFullscreen={() => setFullscreenResource(resource)}
                            />
                        ))}
                        {filteredResources.length === 0 && !isResolving && (
                            <div className="col-span-full text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-lg">No hay recursos para este filtro</p>
                                <p className="text-sm mt-2">Intenta con otro momento o tipo de recurso</p>
                            </div>
                        )}
                    </div>
                )}

                {/* No resources message */}
                {recursos.length === 0 && activeFilter !== 'fichas' && (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg">Esta sesión no tiene recursos virtuales</p>
                        <p className="text-sm mt-2">Las sesiones nuevas incluirán recursos automáticamente</p>
                        <button
                            onClick={() => setActiveFilter('fichas')}
                            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            Ver Fichas disponibles
                        </button>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal for Resources */}
            {fullscreenResource && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setFullscreenResource(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Image/Content area */}
                        {fullscreenResource.thumbnail && (
                            <div className="relative bg-slate-900">
                                <img
                                    src={fullscreenResource.thumbnail}
                                    alt={fullscreenResource.title}
                                    className="w-full max-h-[60vh] object-contain mx-auto"
                                />
                            </div>
                        )}

                        <div className={`${MOMENT_COLORS[fullscreenResource.moment].bg} p-6`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${MOMENT_COLORS[fullscreenResource.moment].bg} ${MOMENT_COLORS[fullscreenResource.moment].text} border ${MOMENT_COLORS[fullscreenResource.moment].border}`}>
                                        {MOMENT_LABELS[fullscreenResource.moment]}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-600">
                                        {KIND_LABELS[fullscreenResource.kind]}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setFullscreenResource(null)}
                                    className="p-2 hover:bg-black/10 rounded-full transition-colors text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{fullscreenResource.title}</h2>
                            {fullscreenResource.attribution && (
                                <p className="text-sm text-slate-500 mt-1">{fullscreenResource.attribution}</p>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            {fullscreenResource.notes && (
                                <div className="bg-amber-50 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-amber-800">Uso pedagógico</p>
                                    <p className="text-amber-700 text-sm mt-1">{fullscreenResource.notes}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {fullscreenResource.url && (
                                    <a
                                        href={fullscreenResource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 transition-all"
                                    >
                                        {fullscreenResource.source.mode === 'external' ? (
                                            <>
                                                <Search className="w-5 h-5" />
                                                Buscar en Web
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5" />
                                                Descargar
                                            </>
                                        )}
                                    </a>
                                )}
                                <button className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 flex items-center gap-2 transition-colors">
                                    <Printer className="w-5 h-5" />
                                    Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Modal for Fichas */}
            {fullscreenFicha && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setFullscreenFicha(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={`bg-gradient-to-r ${fullscreenFicha === 'aula' ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600'} text-white p-6`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-80">
                                        Ficha de {fullscreenFicha === 'aula' ? 'Aplicación' : 'Extensión'}
                                    </p>
                                    <h2 className="text-2xl font-bold mt-1">
                                        {fullscreenFicha === 'aula' ? 'Aula' : 'Casa'}
                                    </h2>
                                    <p className="opacity-90 mt-2">
                                        {data.fichas[fullscreenFicha].titulo}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setFullscreenFicha(null)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {groupItemsByHeaders(data.fichas[fullscreenFicha].items).map((group, idx) => (
                                <div key={idx} className="rounded-xl overflow-hidden border border-slate-200">
                                    {group.header && (
                                        <div className={`px-4 py-3 font-bold text-sm ${fullscreenFicha === 'aula'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                            }`}>
                                            {group.header}
                                        </div>
                                    )}
                                    <div className="p-4 space-y-2 bg-slate-50">
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex gap-2 text-sm">
                                                <span className={fullscreenFicha === 'aula' ? 'text-blue-500' : 'text-amber-500'}>›</span>
                                                <MarkdownText text={item} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
                            <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 flex items-center gap-2 transition-colors">
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
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
import React, { useState } from 'react';
import { SessionData, FichaContent } from '../types';
import { SessionGenerator } from '../core/SessionGenerator';
import { ArrowLeft, Printer, BookOpen, Clock, Home, RefreshCw, X, Sparkles, Edit3, Check, Play } from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';

interface SessionResultProps {
    data: SessionData;
    onBack: () => void;
    onViewResources?: () => void;
}

// Tooltip component for better UX
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group/tooltip">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

const EditableList: React.FC<{
    items: string[];
    isEditing: boolean;
    onChange: (newItems: string[]) => void
}> = ({ items, isEditing, onChange }) => {
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
        <ul className="text-slate-800 text-sm leading-relaxed space-y-1.5">
            {items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                    <span className="mr-2 text-primary font-bold">•</span>
                    <MarkdownText text={item} />
                </li>
            ))}
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

const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, onBack, onViewResources }) => {
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [printSection, setPrintSection] = useState<'none' | 'session' | 'ficha_aula' | 'ficha_casa'>('none');
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handlePrint = (section: 'session' | 'ficha_aula' | 'ficha_casa') => {
        setPrintSection(section);
        setTimeout(() => {
            window.print();
            setPrintSection('none');
        }, 100);
    };

    const handleRegenerate = async (section: keyof SessionData, instructions: string) => {
        if (!confirm("¿Deseas regenerar esta sección? Se perderán los cambios manuales.")) return;
        setRegenerating(section);
        try {
            const newData = await SessionGenerator.regenerateSection(data, section, instructions);
            setData(prev => ({ ...prev, [section]: newData }));
        } catch (e) {
            alert("Error regenerando sección.");
        } finally {
            setRegenerating(null);
        }
    };

    // Helper to update deeply nested state
    const updateSection = (section: keyof SessionData, field: string, value: any) => {
        setData(prev => ({
            ...prev,
            [section]: {
                ...prev[section] as any,
                [field]: value
            }
        }));
    };

    const isPrinting = printSection !== 'none';
    const showSession = !isPrinting || printSection === 'session';
    const showFichaAula = !isPrinting || printSection === 'ficha_aula';
    const showFichaCasa = !isPrinting || printSection === 'ficha_casa';

    return (
        <div className={`min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0 ${isPrinting ? 'print-mode' : ''}`}>


            {/* Navbar */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
                <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Volver
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* VIEW RESOURCES - Primary CTA */}
                    {onViewResources && (
                        <button
                            onClick={onViewResources}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">Ver Recursos</span>
                        </button>
                    )}

                    {/* EDIT BUTTON - Larger and more prominent */}
                    <Tooltip text={isEditing ? "Guardar cambios" : "Editar contenido de la sesión"}>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-md ${isEditing
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 ring-2 ring-emerald-300 ring-offset-2'
                                : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900'
                                }`}
                        >
                            {isEditing ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Guardar</span>
                                </>
                            ) : (
                                <>
                                    <Edit3 className="w-5 h-5" />
                                    <span>Editar Sesión</span>
                                </>
                            )}
                        </button>
                    </Tooltip>

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-all"
                        >
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                        {showExportMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setShowExportMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-30">
                                    <button
                                        onClick={() => { handlePrint('session'); setShowExportMenu(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        📄 PDF Sesión
                                    </button>
                                    <button
                                        onClick={() => { handlePrint('ficha_aula'); setShowExportMenu(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        📝 PDF Ficha Aula
                                    </button>
                                    <button
                                        onClick={() => { handlePrint('ficha_casa'); setShowExportMenu(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        🏠 PDF Ficha Casa
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Mode Banner - Floating indicator */}
            {isEditing && (
                <div className="sticky top-[60px] z-10 mx-4 mt-4 no-print">
                    <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                            <span className="font-bold">✏️ Modo Edición Activo</span>
                            <span className="text-emerald-100 text-sm hidden sm:inline">— Haz clic en los textos para editarlos o usa los botones "Regenerar" para crear nuevo contenido con IA</span>
                        </div>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>
            )}


            <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">

                {/* SESSION VIEW */}
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
                                onRegenerate={() => handleRegenerate('inicio', 'Cambia la motivación por algo más participativo y lúdico.')}
                                isLoading={regenerating === 'inicio'}
                                isEditing={isEditing}
                            />
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivación</span>
                                    <EditableList items={data.inicio.motivacion} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'motivacion', val)} />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saberes Previos</span>
                                    <EditableList items={data.inicio.saberesPrevios} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'saberesPrevios', val)} />
                                </div>
                            </div>
                        </div>

                        {/* DESARROLLO */}
                        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                            <SectionHeader
                                title="Desarrollo"
                                icon={<BookOpen className="w-5 h-5" />}
                                colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
                                onRegenerate={() => handleRegenerate('desarrollo', 'Genera estrategias más interactivas y dinámicas.')}
                                isLoading={regenerating === 'desarrollo'}
                                isEditing={isEditing}
                            />
                            <div className="p-6">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias</span>
                                    <EditableList items={data.desarrollo.estrategias} isEditing={isEditing} onChange={(val) => updateSection('desarrollo', 'estrategias', val)} />
                                </div>
                            </div>
                        </div>

                        {/* CIERRE */}
                        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                            <SectionHeader
                                title="Cierre"
                                icon={<Clock className="w-5 h-5" />}
                                colorClass="bg-amber-50 text-amber-800 border-amber-100"
                                onRegenerate={() => handleRegenerate('cierre', 'Mejora las estrategias de cierre con más reflexión.')}
                                isLoading={regenerating === 'cierre'}
                                isEditing={isEditing}
                            />
                            <div className="p-6">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias de Cierre</span>
                                    <EditableList items={data.cierre.estrategias} isEditing={isEditing} onChange={(val) => updateSection('cierre', 'estrategias', val)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FICHA AULA */}
                <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
                    <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                        <div className="border-b border-blue-100 pb-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Aplicación: Aula</h2>
                            </div>
                            <p className="text-sm text-slate-500 ml-10">{data.fichas.aula.titulo}</p>
                        </div>
                        <div className="space-y-3">
                            {groupItemsByHeaders(data.fichas.aula.items).map((group, groupIdx) => (
                                <div key={groupIdx} className="rounded-xl overflow-hidden">
                                    {group.header && (
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 font-bold text-sm">
                                            {group.header}
                                        </div>
                                    )}
                                    <div className={`${group.header ? 'bg-blue-50/50 border border-blue-100 border-t-0' : 'bg-slate-50 border border-slate-100'} p-4 space-y-2`}>
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex gap-3 items-start text-sm">
                                                <span className="text-blue-500 font-bold mt-0.5">›</span>
                                                <MarkdownText text={item} className="text-slate-700 leading-relaxed" />
                                            </div>
                                        ))}
                                        {group.items.length === 0 && !group.header && (
                                            <p className="text-slate-400 italic text-sm">Sin contenido</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FICHA CASA */}
                <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
                    <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                        <div className="border-b border-amber-100 pb-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Home className="w-4 h-4 text-amber-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Extensión: Casa</h2>
                            </div>
                            <p className="text-sm text-slate-500 ml-10">{data.fichas.casa.titulo}</p>
                        </div>
                        <div className="space-y-3">
                            {groupItemsByHeaders(data.fichas.casa.items).map((group, groupIdx) => (
                                <div key={groupIdx} className="rounded-xl overflow-hidden">
                                    {group.header && (
                                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-3 font-bold text-sm">
                                            {group.header}
                                        </div>
                                    )}
                                    <div className={`${group.header ? 'bg-amber-50/50 border border-amber-100 border-t-0' : 'bg-slate-50 border border-slate-100'} p-4 space-y-2`}>
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex gap-3 items-start text-sm">
                                                <span className="text-amber-500 font-bold mt-0.5">›</span>
                                                <MarkdownText text={item} className="text-slate-700 leading-relaxed" />
                                            </div>
                                        ))}
                                        {group.items.length === 0 && !group.header && (
                                            <p className="text-slate-400 italic text-sm">Sin contenido</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Hidden style for printing specific sections logic */}
            <style>{`
        @media print {
            body { background: white; }
            .no-print { display: none !important; }
            .print-mode .hidden { display: none !important; }
            .print-mode .block { display: block !important; }
        }
      `}</style>
        </div>
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
  private static formatList(items: string[] | undefined, latexPrefix: string = "\\item "): string {
    if (!items || items.length === 0) return "";
    return "\\begin{itemize}[leftmargin=*,nosep] " + items.map(i => `${latexPrefix}${i}`).join(" ") + " \\end{itemize}";
  }

  private static formatSimpleList(items: string[] | undefined): string {
    if (!items || items.length === 0) return "";
    return items.join(", ");
  }

  static generateLatex(data: SessionData): string {
    let tex = LATEX_TEMPLATE;

    // Metadata
    tex = tex.replace(/\[NOMBRE_SESION\]/g, data.sessionTitle);
    tex = tex.replace(/\[AREA\]/g, data.area);
    tex = tex.replace(/\[CICLO_GRADO\]/g, data.cycleGrade);
    tex = tex.replace(/\[DOCENTE\]/g, data.teacherName);

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
import { Prompts } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest } = request;

    // Base Identity
    let composed = `${Prompts.maestro.role}\n${Prompts.maestro.task}\n${Prompts.maestro.style}\n`;

    // Structure requirement
    composed += `\nESTRUCTURA REQUERIDA:\n${Prompts.maestro.structure}\n`;

    // Global constraints
    composed += `\nREGLAS OBLIGATORIAS:\n`;
    Prompts.maestro.constraints.forEach((constraint: string, idx: number) => {
      composed += `${idx + 1}. ${constraint}\n`;
    });

    // Level Specifics
    let levelPrompt = Prompts.primaria;
    if (nivel === 'Inicial') levelPrompt = Prompts.inicial;
    if (nivel === 'Secundaria') levelPrompt = Prompts.secundaria;

    composed += `\nENFOQUE DE NIVEL (${nivel}):\n`;
    composed += `Enfoque pedagógico: ${levelPrompt.focus}\n`;
    composed += `Materiales sugeridos: ${levelPrompt.materials}\n`;
    composed += `Tono: ${levelPrompt.tone}\n`;

    // Level-specific grade rules
    if (levelPrompt.gradeRules && levelPrompt.gradeRules.length > 0) {
      composed += `\nReglas específicas para ${nivel}:\n`;
      levelPrompt.gradeRules.forEach((rule: string) => {
        composed += `- ${rule}\n`;
      });
    }

    // Fichas instruction
    composed += `\nFICHAS:\n${Prompts.fichas.instruction}\n`;

    // Resources instruction
    composed += `\nRECURSOS VIRTUALES:\n${Prompts.recursos.instruction}\n`;

    // Organizers instruction (Mermaid diagrams)
    composed += `\nORGANIZADORES VISUALES CON CÓDIGO MERMAID:\n${Prompts.organizadores.instruction}\n`;

    // Specific Context
    composed += `\n========================================\n`;
    composed += `CONTEXTO ESPECÍFICO DE ESTA SESIÓN:\n`;
    composed += `Nivel: ${nivel}\n`;
    composed += `Grado: ${grado}\n`;
    composed += `Área: ${area}\n`;
    composed += `\nPEDIDO DEL DOCENTE:\n"${userRequest}"\n`;
    composed += `========================================\n`;

    return composed;
  }

  static composeRegeneration(section: string, currentContent: any, instructions: string): string {
    return `
      Eres el mismo experto pedagogo. Necesito que RE-ESCRIBAS solamente la sección: "${section}".
      
      Contenido actual (para referencia):
      ${JSON.stringify(currentContent)}
      
      Nuevas instrucciones para el cambio:
      "${instructions}"
      
      Mantén el mismo formato JSON estricto para esta sección.
    `;
  }

  static composeResourcesRegeneration(currentResources: any[], nivel: string, instructions: string): string {
    return `
      Eres el mismo experto pedagogo. Necesito que RE-GENERES los recursos virtuales de la sesión.
      
      Recursos actuales (para referencia):
      ${JSON.stringify(currentResources)}
      
      Nivel educativo: ${nivel}
      
      Nuevas instrucciones:
      "${instructions}"
      
      Recuerda:
      - Para temas reales/específicos, usa mode: "external" con providerHint y queryHint.
      - Solo usa mode: "generated" para contenido creativo o ficticio.
      
      Mantén el formato JSON estricto del schema de recursos.
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
import { SessionData, SessionRequest, Resource } from "../types";
import { Type } from "@google/genai";
import { RESOLVED_RESOURCES_RESPONSE_SCHEMA } from "../schemas/resolvedResourceSchema";
import recursosResolver from "../prompts/prompt_recursos_resolver.json";

export class SessionGenerator {
  private static retryPolicy = new RetryPolicy();
  private static modelId = "gemini-2.5-flash";

  static async generate(request: SessionRequest): Promise<SessionData> {
    const fullPrompt = PromptComposer.compose(request);

    // Build content parts - text always, image optional
    const parts: any[] = [{ text: fullPrompt }];

    // If image is provided, add it to the request for vision analysis
    if (request.imageBase64 && request.imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: request.imageMimeType,
          data: request.imageBase64
        }
      });
    }

    return this.retryPolicy.execute(async () => {
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [
          { role: 'user', parts }
        ],
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

  static async regenerateSection(
    currentData: SessionData,
    sectionKey: keyof SessionData,
    instructions: string
  ): Promise<any> {
    // Determine the partial schema for the section
    let partialSchema: any;

    // We need to look up the schema definition from SESSION_SCHEMA
    // This is a simplification; normally we'd traverse the schema object carefully.
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
        model: this.modelId,
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

  /**
   * Second LLM call: Resolve resources with direct URLs
   * Takes the generated recursos array and asks LLM to provide direct URLs
   */
  static async resolveResourcesWithLLM(recursos: Resource[], sessionTitle: string, nivel: string): Promise<any> {
    if (!recursos || recursos.length === 0) {
      return { resolvedResources: [] };
    }

    // Build context for LLM
    const contextPrompt = `${recursosResolver.role}\n${recursosResolver.task}\n\n`;
    const instructions = recursosResolver.instructions.join("\n");

    const prompt = `${contextPrompt}\n${instructions}\n\nSESSION TITLE: ${sessionTitle}\nEDUCATIONAL LEVEL: ${nivel}\n\nRESOURCES TO RESOLVE:\n${JSON.stringify(recursos, null, 2)}\n\nFor each resource, provide a direct URL to the actual content (image or video). DO NOT provide search URLs. Use trusted educational sources like:\n- Wikimedia Commons for images\n- YouTube (embed format: https://www.youtube.com/embed/VIDEO_ID) for videos\n- NASA, National Geographic, educational institutions\n\nIf the resource is creative/fictional, mark mode='generated' so it can be created with AI later.\n\nProvide the response in the specified schema format with resolvedResources array.`;

    return this.retryPolicy.execute(async () => {
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESOLVED_RESOURCES_RESPONSE_SCHEMA
        }
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty resource resolution response");
      return JSON.parse(jsonText);
    });
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet">
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
export const Prompts = {
  maestro: {
    role: "Eres un experto pedagogo peruano especializado en el Currículo Nacional (CNEB).",
    task: "Tu tarea es crear una Sesión de Aprendizaje completa y detallada en formato JSON estricto según el esquema proporcionado por el sistema.",
    style: "Usa un lenguaje pedagógico claro, empático y directo, adecuado para docentes de escuela pública. Cumple estas reglas globales: 1) Completa siempre todos los arreglos de materiales de Inicio, Desarrollo, Cierre y Tarea. 2) Los materiales deben ser recursos concretos para dinamizar la clase: imágenes, videos, lecturas breves, organizadores visuales, recursos digitales o materiales del entorno. 3) Incluye al menos un organizador visual por sesión y descríbelo de forma que el docente pueda usarlo en aula o el estudiante copiarlo en el cuaderno. 4) El organizador visual debe derivarse del Propósito Didáctico. 5) No incluyas URLs ni citas textuales ni marcas de referencia; en su lugar, menciona la fuente institucional sugerida o el tipo de recurso de manera descriptiva. 6) Cuando el tema sea específico y real (personas, obras artísticas reconocidas, hechos históricos, ciencia), sugiere recursos externos y confiables sin inventar detalles. 7) Solo sugiere recursos generados por IA cuando el contenido sea claramente creativo o inventado (cuentos, personajes ficticios, escenas imaginadas), y descríbelos como 'imagen generada sugerida' o 'video animado sugerido'. 8) Mantén coherencia entre nivel, grado, área y el pedido del docente.",
    structure: "La estructura debe ser estricta: Inicio, Desarrollo, Cierre, Tarea en casa y Fichas.",
    constraints: [
      "Incluye materiales concretos y realistas en todos los momentos.",
      "El campo 'teacherName' déjalo como '___________'.",
      "No uses enlaces ni referencias en formato bibliográfico.",
      "Asegura que los materiales sean adecuados al nivel, edad y contexto escolar peruano."
    ]
  },
  inicial: {
    focus: "Enfócate en el aprendizaje a través del juego, el movimiento, la exploración sensorial y la comunicación oral. Prioriza rutinas simples, consignas cortas y aprendizaje vivencial.",
    materials: "Usa materiales grandes, coloridos, manipulables y seguros del entorno inmediato. Incluye siempre recursos visuales simples y lúdicos. Si se sugiere un recurso virtual, descríbelo como material para proyectar o mostrar en pantalla.",
    tone: "Muy lúdico, cariñoso, paciente y motivador. Evita exceso de tecnicismos.",
    gradeRules: [
      "En 'propositoDidactico' incluye solo un propósito.",
      "El propósito debe describir un organizador visual muy simple o una producción gráfica adecuada a inicial.",
      "En materiales sugiere al menos una imagen generada solo si el pedido es creativo o narrativo infantil.",
      "Si el tema es real y específico, sugiere imágenes externas de referencia sin inventarlas."
    ]
  },
  primaria: {
    focus: "Enfócate en la construcción del conocimiento mediante material concreto, situaciones vivenciales, trabajo colaborativo y andamiaje progresivo. Integra preguntas guiadas y momentos de metacognición simples.",
    materials: "Material estructurado y no estructurado del entorno, recursos impresos, material manipulativo y recursos digitales breves. Incluye siempre al menos un organizador visual que el estudiante pueda copiar en el cuaderno.",
    tone: "Motivador, reflexivo y participativo, con instrucciones claras y ejemplos sencillos.",
    gradeRules: [
      "En 'propositoDidactico' incluye solo un propósito.",
      "El propósito debe estar formulado como producto claro del estudiante e insinuar el organizador visual que se usará.",
      "En materiales incluye una imagen clave del tema y un organizador visual.",
      "Solo sugiere imágenes generadas si el contenido es creativo o ficticio; para temas reales, menciona fuentes institucionales sugeridas."
    ]
  },
  secundaria: {
    focus: "Enfócate en pensamiento crítico, indagación, análisis de fuentes, argumentación y autonomía. Promueve discusión, síntesis y aplicación en contextos reales.",
    materials: "Recursos tecnológicos, textos breves, laboratorios, datos, estudios de caso y organizadores visuales de mayor complejidad. Incluye materiales digitales listos para proyectar.",
    tone: "Retador, académico pero accesible, fomentando ciudadanía y rigor.",
    gradeRules: [
      "En 'propositoDidactico' incluye uno o dos propósitos coherentes con el tema.",
      "Cada propósito debe conectar con un organizador visual o evidencia de aprendizaje.",
      "En materiales sugiere al menos una imagen o recurso audiovisual externo confiable cuando el tema sea real.",
      "Evita proponer imágenes generadas para contenidos históricos, científicos o artísticos específicos."
    ]
  },
  fichas: {
    instruction: "Genera dos fichas de aplicación distintas: una para desarrollar en el aula (trabajo grupal o individual guiado) y otra para casa (refuerzo o extensión). Deben ser claras y listas para imprimir. Puedes usar encabezados internos marcados en texto para organizar por secciones temáticas cuando sea pertinente."
  },
  recursos: {
    instruction: "Además de describir materiales por momento, propone recursos virtuales concretos para proyectar o usar en clase: imágenes, videos cortos, lecturas breves. No incluyas URLs. Para temas reales y específicos, menciona la institución o colección recomendada como fuente sugerida. Para temas creativos o ficticios en inicial/primaria, puedes describir una imagen o lámina generada sugerida."
  },
  organizadores: {
    instruction: `IMPORTANTE: Genera al menos UN organizador visual en el campo 'organizadores' con código Mermaid válido.

TIPOS SOPORTADOS:
- mapa-conceptual: Usa 'flowchart TB' para jerarquías verticales
- mapa-mental: Usa 'mindmap' para ideas radiales
- espina-pescado: Usa 'flowchart LR' horizontal con forma de espina
- cruz-esquematica: Usa 'flowchart TB' con 4 cuadrantes
- diagrama-flujo: Usa 'flowchart TD' o 'flowchart LR'
- cuadro-sinoptico: Usa 'flowchart LR' con llaves simuladas
- linea-tiempo: Usa 'flowchart LR' horizontal secuencial
- cuadro-comparativo: Usa 'flowchart TB' con columnas paralelas
- arbol-ideas: Usa 'flowchart TB' jerárquico
- diagrama-venn: Describe en textFallback (Mermaid no soporta Venn directamente)

REGLAS MERMAID ESTRICTAS:
1. Usa sintaxis correcta de Mermaid 10
2. SIEMPRE envuelve etiquetas con espacios o caracteres especiales entre comillas: A["Texto con espacios"]
3. NUNCA uses paréntesis () ni corchetes [] dentro de etiquetas sin comillas
4. Usa IDs cortos sin espacios: A, B, C, nodo1, concepto2
5. Para inicial: máximo 4-5 nodos simples, textos cortos
6. Para primaria: 5-8 nodos con relaciones claras
7. Para secundaria: hasta 10-12 nodos con mayor complejidad
8. Siempre incluye textFallback como respaldo
9. EVITA caracteres especiales: (, ), [, ], {, }, <, >, &, |, #
10. Si necesitas paréntesis usa: A["Texto entre parentesis"]

EJEMPLOS VÁLIDOS:

Mapa conceptual (primaria - La Decena):
\`\`\`mermaid
flowchart TB
    A["LA DECENA"]
    A --> B["10 unidades"]
    A --> C["Grupo de 10"]
    B --> D["1, 2, 3...10"]
    C --> E["🍎🍎🍎🍎🍎<br>🍎🍎🍎🍎🍎"]
\`\`\`

Mapa mental (secundaria - Ecosistemas):
\`\`\`mermaid
mindmap
  root((ECOSISTEMA))
    Biótico
      Productores
      Consumidores
      Descomponedores
    Abiótico
      Agua
      Suelo
      Luz
    Relaciones
      Cadena alimenticia
      Simbiosis
\`\`\`

Espina de pescado (Causas):
\`\`\`mermaid
flowchart LR
    subgraph Causas
    A1["Causa 1"] --> E
    A2["Causa 2"] --> E
    B1["Causa 3"] --> E
    B2["Causa 4"] --> E
    end
    E(["EFECTO/PROBLEMA"])
\`\`\`

El código debe ser renderizable directamente por Mermaid.js versión 10.`
  }
};

```

## File: `prompts\prompt_fichas.json`
```json
{
  "instruction": "Genera dos fichas de aplicación distintas: una para desarrollar en el aula (trabajo grupal o individual guiado) y otra para casa (refuerzo o extensión). Deben ser claras y listas para imprimir. Puedes usar encabezados internos marcados en texto para organizar por secciones temáticas cuando sea pertinente."
}
```

## File: `prompts\prompt_inicial.json`
```json
{
  "focus": "Enfócate en el aprendizaje a través del juego, el movimiento, la exploración sensorial y la comunicación oral. Prioriza rutinas simples, consignas cortas y aprendizaje vivencial.",
  "materials": "Usa materiales grandes, coloridos, manipulables y seguros del entorno inmediato. Incluye siempre recursos visuales simples y lúdicos. Si se sugiere un recurso virtual, descríbelo como material para proyectar o mostrar en pantalla.",
  "tone": "Muy lúdico, cariñoso, paciente y motivador. Evita exceso de tecnicismos.",
  "gradeRules": [
    "En 'propositoDidactico' incluye solo un propósito.",
    "El propósito debe describir un organizador visual muy simple o una producción gráfica adecuada a inicial.",
    "En materiales sugiere al menos una imagen generada solo si el pedido es creativo o narrativo infantil.",
    "Si el tema es real y específico, sugiere imágenes externas de referencia sin inventarlas."
  ]
}
```

## File: `prompts\prompt_maestro.json`
```json
{
  "role": "Eres un experto pedagogo peruano especializado en el Currículo Nacional (CNEB).",
  "task": "Tu tarea es crear una Sesión de Aprendizaje completa y detallada en formato JSON estricto según el esquema proporcionado por el sistema.",
  "style": "Usa un lenguaje pedagógico claro, empático y directo, adecuado para docentes de escuela pública. Cumple estas reglas globales: 1) Completa siempre todos los arreglos de materiales de Inicio, Desarrollo, Cierre y Tarea. 2) Los materiales deben ser recursos concretos para dinamizar la clase: imágenes, videos, lecturas breves, organizadores visuales, recursos digitales o materiales del entorno. 3) Incluye al menos un organizador visual por sesión y descríbelo de forma que el docente pueda usarlo en aula o el estudiante copiarlo en el cuaderno. 4) El organizador visual debe derivarse del Propósito Didáctico. 5) No incluyas URLs ni citas textuales ni marcas de referencia; en su lugar, menciona la fuente institucional sugerida o el tipo de recurso de manera descriptiva. 6) Cuando el tema sea específico y real (personas, obras artísticas reconocidas, hechos históricos, ciencia), sugiere recursos externos y confiables sin inventar detalles. 7) Solo sugiere recursos generados por IA cuando el contenido sea claramente creativo o inventado (cuentos, personajes ficticios, escenas imaginadas), y descríbelos como ‘imagen generada sugerida’ o ‘video animado sugerido’. 8) Mantén coherencia entre nivel, grado, área y el pedido del docente.",
  "structure": "La estructura debe ser estricta: Inicio, Desarrollo, Cierre, Tarea en casa y Fichas.",
  "constraints": [
    "Incluye materiales concretos y realistas en todos los momentos.",
    "El campo 'teacherName' déjalo como '___________'.",
    "No uses enlaces ni referencias en formato bibliográfico.",
    "Asegura que los materiales sean adecuados al nivel, edad y contexto escolar peruano."
  ]
}
```

## File: `prompts\prompt_primaria.json`
```json
{
  "focus": "Enfócate en la construcción del conocimiento mediante material concreto, situaciones vivenciales, trabajo colaborativo y andamiaje progresivo. Integra preguntas guiadas y momentos de metacognición simples.",
  "materials": "Material estructurado y no estructurado del entorno, recursos impresos, material manipulativo y recursos digitales breves. Incluye siempre al menos un organizador visual que el estudiante pueda copiar en el cuaderno.",
  "tone": "Motivador, reflexivo y participativo, con instrucciones claras y ejemplos sencillos.",
  "gradeRules": [
    "En 'propositoDidactico' incluye solo un propósito.",
    "El propósito debe estar formulado como producto claro del estudiante e insinuar el organizador visual que se usará.",
    "En materiales incluye una imagen clave del tema y un organizador visual.",
    "Solo sugiere imágenes generadas si el contenido es creativo o ficticio; para temas reales, menciona fuentes institucionales sugeridas.",
    "Genera SIEMPRE un ítem en el arreglo 'organizadores' con código Mermaid válido siguiendo las instrucciones generales."
  ]
}
```

## File: `prompts\prompt_recursos.json`
```json
{
    "instruction": "Además de describir materiales por momento, propone recursos virtuales concretos para proyectar o usar en clase: imágenes, videos cortos, lecturas breves y un organizador visual. No incluyas URLs. Para temas reales y específicos, menciona la institución o colección recomendada como fuente sugerida. Para temas creativos o ficticios en inicial/primaria, puedes describir una imagen o lámina generada sugerida."
}
```

## File: `prompts\prompt_recursos_resolver.json`
```json
{
    "role": "Eres un curador experto en recursos educativos digitales y multimedia. Tu conocimiento incluye URLs directas de imágenes y videos de fuentes educativas confiables.",
    "task": "Para cada recurso listado, PROPORCIONA una URL DIRECTA VÁLIDA a una imagen o video educativo real. NO uses URLs de búsqueda de Google ni search.yahoo.com. SOLO URLs directas a archivos de imagen (.jpg, .png) o videos de YouTube.",
    "instructions": [
        "Para IMÁGENES sobre fotosíntesis, plantas, naturaleza: usa Wikimedia Commons URLs directas como https://upload.wikimedia.org/wikipedia/commons/...",
        "Para VIDEOS: usa formato embed de YouTube https://www.youtube.com/embed/VIDEO_ID donde VIDEO_ID es el ID real de un video educativo conocido",
        "Ejemplos de URLs VÁLIDAS:",
        "  - Imagen: https://upload.wikimedia.org/wikipedia/commons/5/5f/Photosynthesis_en.svg",
        "  - Video: https://www.youtube.com/embed/sQK3Yr4Sc_k",
        "Ejemplos de URLs INVÁLIDAS (NO USES):",
        "  - https://www.google.com/search?q=...",
        "  - https://images.google.com/...",
        "Si no conoces una URL exacta para un recurso creativo o ficticio, marca mode='generated'",
        "IMPORTANTE: Los VIDEO_ID de YouTube deben ser de videos educativos reales sobre el tema"
    ],
    "examples": {
        "fotosintesis_imagen": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Photosynthesis_en.svg",
        "fotosintesis_video": "https://www.youtube.com/embed/sQK3Yr4Sc_k",
        "planta_imagen": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Photosynthesis.jpg"
    },
    "output_format": "Devuelve un objeto {resolvedResources: [{id, resolvedUrl, mode, sourceName}]} para CADA recurso"
}
```

## File: `prompts\prompt_secundaria.json`
```json
{
  "focus": "Enfócate en pensamiento crítico, indagación, análisis de fuentes, argumentación y autonomía. Promueve discusión, síntesis y aplicación en contextos reales.",
  "materials": "Recursos tecnológicos, textos breves, laboratorios, datos, estudios de caso y organizadores visuales de mayor complejidad. Incluye materiales digitales listos para proyectar.",
  "tone": "Retador, académico pero accesible, fomentando ciudadanía y rigor.",
  "gradeRules": [
    "En 'propositoDidactico' incluye uno o dos propósitos coherentes con el tema.",
    "Cada propósito debe conectar con un organizador visual o evidencia de aprendizaje.",
    "En materiales sugiere al menos una imagen o recurso audiovisual externo confiable cuando el tema sea real.",
    "Evita proponer imágenes generadas para contenidos históricos, científicos o artísticos específicos."
  ]
}
```

## File: `schemas\resolvedResourceSchema.ts`
```ts
import { Type, Schema } from "@google/genai";

// Schema for the resolved resource response
export const RESOLVED_RESOURCE_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        id: {
            type: Type.STRING,
            description: "The ID of the resource from the original recursos array"
        },
        resolvedUrl: {
            type: Type.STRING,
            description: "DIRECT URL to the image or video. For images: must be a direct .jpg/.png URL. For videos: use YouTube embed format https://www.youtube.com/embed/VIDEO_ID. NEVER use search URLs."
        },
        thumbnailUrl: {
            type: Type.STRING,
            description: "Direct URL to a thumbnail image (optional, for videos)"
        },
        mode: {
            type: Type.STRING,
            enum: ["direct", "generated"],
            description: "'direct' for URLs found from trusted sources, 'generated' if content should be created with AI"
        },
        sourceName: {
            type: Type.STRING,
            description: "Name of the source (e.g., 'NASA Images', 'National Geographic', 'Wikimedia Commons')"
        }
    },
    required: ["id", "resolvedUrl", "mode"]
};

export const RESOLVED_RESOURCES_RESPONSE_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        resolvedResources: {
            type: Type.ARRAY,
            items: RESOLVED_RESOURCE_SCHEMA,
            description: "Array of resolved resources with direct URLs"
        }
    },
    required: ["resolvedResources"]
};

```

## File: `schemas\sessionSchema.ts`
```ts
import { Type, Schema } from "@google/genai";

// Organizer visual schema - supports Mermaid diagrams
const ORGANIZER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique identifier (e.g., 'org-mapa-conceptual-1')" },
    title: { type: Type.STRING, description: "Título descriptivo del organizador" },
    type: {
      type: Type.STRING,
      enum: ["mapa-conceptual", "espina-pescado", "cruz-esquematica", "diagrama-flujo", "cuadro-sinoptico", "mapa-mental", "linea-tiempo", "cuadro-comparativo", "arbol-ideas", "diagrama-venn", "otro"],
      description: "Tipo de organizador visual"
    },
    description: { type: Type.STRING, description: "Descripción breve del contenido y propósito del organizador" },
    mermaidCode: {
      type: Type.STRING,
      description: "Código Mermaid válido para renderizar el diagrama. Usar sintaxis flowchart TB para mapas, mindmap para mapas mentales. IMPORTANTE: Escapar caracteres especiales en las etiquetas."
    },
    textFallback: {
      type: Type.STRING,
      description: "Representación en texto plano del organizador (por si falla el renderizado)"
    },
    notes: { type: Type.STRING, description: "Instrucciones para el docente sobre cómo usar este organizador" }
  },
  required: ["id", "title", "type", "mermaidCode", "textFallback"]
};

// Resource schema for structured virtual resources
const RESOURCE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique identifier for the resource (e.g., 'img-inicio-1', 'video-desarrollo-1')" },
    title: { type: Type.STRING, description: "Brief descriptive title of the resource" },
    kind: {
      type: Type.STRING,
      enum: ["image", "video", "organizer", "reading", "worksheet", "other"],
      description: "Type of resource"
    },
    moment: {
      type: Type.STRING,
      enum: ["inicio", "desarrollo", "cierre", "tarea", "general"],
      description: "Which moment of the session this resource belongs to"
    },
    intent: {
      type: Type.STRING,
      enum: ["project", "print", "copy-to-notebook", "demo", "homework"],
      description: "How the resource is intended to be used"
    },
    source: {
      type: Type.OBJECT,
      properties: {
        mode: {
          type: Type.STRING,
          enum: ["external", "generated"],
          description: "'external' for real resources from institutions, 'generated' for AI-generated content"
        },
        providerHint: { type: Type.STRING, description: "Institution, museum, or collection suggested (for external mode)" },
        queryHint: { type: Type.STRING, description: "Search term suggested to find the resource (for external mode)" },
        generationHint: { type: Type.STRING, description: "Brief prompt to generate the resource (for generated mode, only for creative/fictional content)" }
      },
      required: ["mode"]
    },
    notes: { type: Type.STRING, description: "Pedagogical usage notes for the teacher" }
  },
  required: ["id", "title", "kind", "moment", "intent", "source"]
};

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
    // Structured virtual resources (images, videos, readings)
    recursos: {
      type: Type.ARRAY,
      items: RESOURCE_SCHEMA,
      description: "Array of virtual resources for the session: images, videos, readings. Do NOT include organizers here."
    },
    // NEW: Visual organizers with Mermaid code
    organizadores: {
      type: Type.ARRAY,
      items: ORGANIZER_SCHEMA,
      description: "Array of visual organizers (concept maps, fishbone diagrams, etc.) with Mermaid code for rendering. Include at least 1 organizer per session."
    }
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas", "recursos", "organizadores"],
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

## File: `services\ResourceResolver.ts`
```ts
import { ai } from './geminiService';
import { Resource, ResolvedResource, ResourceKind } from '../types';

/**
 * ResourceResolver - Resolves resource hints into actual content
 * 
 * For 'external' resources: Generates search URLs for Google/YouTube
 * For 'generated' resources: Uses Gemini Imagen API to create images
 */
export class ResourceResolver {
    private static readonly SEARCH_PROVIDERS = {
        image: 'https://www.google.com/search?tbm=isch&q=',
        video: 'https://www.youtube.com/results?search_query=',
        reading: 'https://www.google.com/search?q=',
        organizer: 'https://www.google.com/search?tbm=isch&q=organizador+visual+',
        worksheet: 'https://www.google.com/search?q=ficha+de+trabajo+',
        other: 'https://www.google.com/search?q='
    };

    // Use a widely available model version or the one specified by Google GenAI docs for v1beta
    private static readonly IMAGEN_MODEL = 'imagen-3.0-generate-001';

    /**
     * Resolve all resources in a session in parallel
     */
    static async resolveAll(resources: Resource[], nivel: string): Promise<ResolvedResource[]> {
        if (!resources || resources.length === 0) {
            return [];
        }

        const resolvePromises = resources.map(resource =>
            this.resolveResource(resource, nivel)
        );

        return Promise.all(resolvePromises);
    }

    /**
     * Resolve a single resource
     */
    static async resolveResource(resource: Resource, nivel: string): Promise<ResolvedResource> {
        const baseResolved: ResolvedResource = {
            ...resource,
            status: 'pending'
        };

        try {
            if (resource.source.mode === 'external') {
                return this.resolveExternalResource(resource);
            } else if (resource.source.mode === 'generated') {
                return await this.resolveGeneratedResource(resource, nivel);
            }

            return { ...baseResolved, status: 'resolved' };
        } catch (error) {
            console.error(`Failed to resolve resource ${resource.id}:`, error);
            return { ...baseResolved, status: 'error' };
        }
    }

    /**
     * Resolve an external resource - uses direct URLs from LLM or falls back to search
     */
    private static resolveExternalResource(resource: Resource): ResolvedResource {
        // PRIORITY: Use direct URL from second LLM call if available
        if (resource.source.resolvedUrl) {
            return {
                ...resource,
                status: 'resolved',
                url: resource.source.resolvedUrl,
                thumbnail: resource.source.thumbnailUrl || resource.source.resolvedUrl,
                attribution: resource.source.sourceName || resource.source.providerHint || 'Recurso educativo'
            };
        }

        // FALLBACK: Generate search URL only if no direct URL was provided
        const searchBase = this.SEARCH_PROVIDERS[resource.kind] || this.SEARCH_PROVIDERS.other;

        // Build search query from hints
        let query = resource.source.queryHint || resource.title;
        if (resource.source.providerHint) {
            query += ` ${resource.source.providerHint}`;
        }

        const searchUrl = searchBase + encodeURIComponent(query);

        // Generate a placeholder thumbnail based on kind
        const thumbnail = this.getPlaceholderThumbnail(resource.kind);

        return {
            ...resource,
            status: 'resolved',
            url: searchUrl,
            thumbnail,
            attribution: resource.source.providerHint || 'Búsqueda web'
        };
    }

    /**
     * Resolve a generated resource - uses resolved URL from LLM or fallback
     */
    private static async resolveGeneratedResource(resource: Resource, nivel: string): Promise<ResolvedResource> {
        // PRIORITY: If we have a resolved URL from second LLM call, use it directly
        if (resource.source.resolvedUrl) {
            return {
                ...resource,
                status: 'resolved',
                url: resource.source.resolvedUrl,
                thumbnail: resource.source.thumbnailUrl || resource.source.resolvedUrl,
                attribution: resource.source.sourceName || 'Recurso educativo'
            };
        }

        // Only attempt image generation for image-type resources
        if (resource.kind !== 'image' && resource.kind !== 'organizer') {
            return {
                ...resource,
                status: 'resolved',
                thumbnail: this.getPlaceholderThumbnail(resource.kind),
                attribution: 'Recurso generado'
            };
        }

        try {
            // Build an appropriate prompt
            const prompt = this.buildImagePrompt(resource, nivel);

            // Call Gemini Imagen API
            const result = await ai.models.generateImages({
                model: this.IMAGEN_MODEL,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '16:9',
                    outputMimeType: 'image/png'
                }
            });

            // Extract the generated image
            if (result.generatedImages && result.generatedImages.length > 0) {
                const imageData = result.generatedImages[0].image;

                // Convert to data URL if we have base64 data
                if (imageData?.imageBytes) {
                    const base64 = imageData.imageBytes;
                    const dataUrl = `data:image/png;base64,${base64}`;

                    return {
                        ...resource,
                        status: 'resolved',
                        url: dataUrl,
                        thumbnail: dataUrl,
                        attribution: 'Generado con Gemini Imagen'
                    };
                }
            }

            // Fallback if generation failed
            return {
                ...resource,
                status: 'error',
                thumbnail: this.getPlaceholderThumbnail(resource.kind),
                attribution: 'Error al generar imagen'
            };
        } catch (error) {
            console.error('Image generation failed:', error);

            // FALLBACK: If generation fails (e.g. 404 model not found), 
            // convert to an "External" resource so user can search for it instead.
            console.log('Falling back to external search for resource:', resource.title);

            const searchBase = this.SEARCH_PROVIDERS.image;
            const query = resource.source.generationHint || resource.title;
            const searchUrl = searchBase + encodeURIComponent(query);

            return {
                ...resource,
                status: 'resolved', // Mark as resolved but as search
                url: searchUrl,
                thumbnail: this.getPlaceholderThumbnail(resource.kind), // Placeholder
                attribution: 'Búsqueda sugerida (Imagen IA no disponible)',
                source: {
                    ...resource.source,
                    mode: 'external',
                    providerHint: 'Google Images'
                }
            };
        }
    }

    /**
     * Build an appropriate image generation prompt based on resource and level
     */
    private static buildImagePrompt(resource: Resource, nivel: string): string {
        let basePrompt = resource.source.generationHint || resource.title;

        // Add style modifiers based on level
        if (nivel === 'Inicial') {
            basePrompt += ', cartoon style, colorful, child-friendly, simple shapes, educational illustration for 4-6 year olds';
        } else if (nivel === 'Primaria') {
            basePrompt += ', educational illustration, colorful, clear, suitable for elementary school children, friendly style';
        } else {
            basePrompt += ', educational diagram, clear, modern, suitable for high school students';
        }

        // Add type-specific modifiers
        if (resource.kind === 'organizer') {
            basePrompt += ', visual organizer, diagram, infographic style, labeled sections';
        }

        return basePrompt;
    }

    /**
     * Get a placeholder thumbnail SVG based on resource kind
     */
    private static getPlaceholderThumbnail(kind: ResourceKind): string {
        // Return a simple SVG data URL as placeholder
        const placeholders: Record<ResourceKind, string> = {
            image: this.createSvgDataUrl('🖼️', '#3B82F6'),
            video: this.createSvgDataUrl('🎬', '#EF4444'),
            organizer: this.createSvgDataUrl('📊', '#10B981'),
            reading: this.createSvgDataUrl('📖', '#F59E0B'),
            worksheet: this.createSvgDataUrl('📝', '#8B5CF6'),
            other: this.createSvgDataUrl('📎', '#6B7280')
        };

        return placeholders[kind] || placeholders.other;
    }

    /**
     * Create a simple SVG placeholder as data URL
     */
    private static createSvgDataUrl(emoji: string, bgColor: string): string {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
                <rect width="100%" height="100%" fill="${bgColor}" opacity="0.1"/>
                <text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
            </svg>
        `.trim();

        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    /**
     * Generate a YouTube embed URL from a search query
     */
    static getYouTubeSearchUrl(query: string): string {
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }

    /**
     * Generate a Google Image search URL
     */
    static getGoogleImageSearchUrl(query: string): string {
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    }
}

```

## File: `types.ts`
```ts
// ========================================
// Organizer Types for Visual Diagrams
// ========================================

export type OrganizerType =
  | 'mapa-conceptual'
  | 'espina-pescado'
  | 'cruz-esquematica'
  | 'diagrama-flujo'
  | 'cuadro-sinoptico'
  | 'mapa-mental'
  | 'linea-tiempo'
  | 'cuadro-comparativo'
  | 'arbol-ideas'
  | 'diagrama-venn'
  | 'otro';

export interface Organizer {
  id: string;
  title: string;
  type: OrganizerType;
  description?: string;
  mermaidCode: string;
  textFallback: string;
  notes?: string;
}

// ========================================
// Resource Types for Virtual Resources
// ========================================

export type ResourceKind = 'image' | 'video' | 'organizer' | 'reading' | 'worksheet' | 'other';
export type ResourceMoment = 'inicio' | 'desarrollo' | 'cierre' | 'tarea' | 'general';
export type ResourceIntent = 'project' | 'print' | 'copy-to-notebook' | 'demo' | 'homework';

export interface ResourceSource {
  mode: 'external' | 'generated';
  providerHint?: string;  // Institution/collection suggested for external
  queryHint?: string;     // Search query suggested by LLM
  generationHint?: string; // Generation prompt for AI-generated resources
  // NEW: Fields populated by second LLM call
  resolvedUrl?: string;    // Direct URL to the actual resource
  thumbnailUrl?: string;   // Direct URL to thumbnail (for videos)
  sourceName?: string;     // Name of the source (e.g., "Wikimedia Commons", "NASA")
}

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  moment: ResourceMoment;
  intent: ResourceIntent;
  source: ResourceSource;
  notes?: string; // Pedagogical usage notes
}

// Enriched resource after resolution
export interface ResolvedResource extends Resource {
  status: 'pending' | 'resolved' | 'error';
  url?: string;
  thumbnail?: string;
  attribution?: string;
  license?: string;
}

// ========================================
// Session Types
// ========================================

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
  // Virtual resources (images, videos, readings)
  recursos: Resource[];
  // Visual organizers with Mermaid diagrams
  organizadores: Organizer[];
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
  imageBase64?: string;
  imageMimeType?: string;
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
