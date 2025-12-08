# Project Structure

```
HG_sessionGen/
├── .env.local
├── .gitignore
├── App.tsx
├── components
│   ├── Home.tsx
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
│   └── prompt_secundaria.json
├── schemas
│   └── sessionSchema.ts
├── services
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
GEMINI_API_KEY = AIzaSyBXSaljEiB2QtEVRmQWtJFLj2fvIWqEd64
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
        <SessionResult data={currentSession} onBack={handleBack} />
      )}
    </>
  );
}

export default App;
```

## File: `components\Home.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { NIVELES, GRADOS_INICIAL, GRADOS_PRIMARIA, GRADOS_SECUNDARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData } from '../types';
import { SessionGenerator } from '../core/SessionGenerator';
import { Mic, Loader2, Sparkles, History, ArrowRight } from 'lucide-react';

interface HomeProps {
  onSessionGenerated: (data: SessionData) => void;
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
    
    const messages = ["Estructurando momentos...", "Diseñando estrategias...", "Creando fichas...", "Aplicando formato..."];
    let msgIdx = 0;
    const interval = setInterval(() => {
        setLoadingText(messages[msgIdx % messages.length]);
        msgIdx++;
    }, 2500);

    try {
        const request: SessionRequest = { nivel, grado, area, prompt };
        const data = await SessionGenerator.generate(request);
        
        const newRecord: SessionRecord = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            data,
            preview: data.sessionTitle
        };
        const newHistory = [newRecord, ...history].slice(0, 3);
        setHistory(newHistory);
        localStorage.setItem('aula_history', JSON.stringify(newHistory));
        
        clearInterval(interval);
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

## File: `components\SessionResult.tsx`
```tsx
import React, { useState } from 'react';
import { SessionData, FichaContent } from '../types';
import { ExportManager } from '../core/ExportManager';
import { SessionGenerator } from '../core/SessionGenerator';
import { copyToClipboard } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, BookOpen, GraduationCap, Clock, Home, PenSquare, RefreshCw, Save, X, Sparkles, Edit3, Check } from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';

interface SessionResultProps {
    data: SessionData;
    formatId: string;
    onBack: () => void;
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

const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, formatId, onBack }) => {
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [printSection, setPrintSection] = useState<'none' | 'session' | 'ficha_aula' | 'ficha_casa'>('none');
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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
                <div className="flex items-center gap-3">
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

                    <Tooltip text={copied ? "¡Copiado!" : "Copiar como LaTeX"}>
                        <button
                            onClick={handleCopyLatex}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${copied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <FileJson className="w-5 h-5" />
                        </button>
                    </Tooltip>

                    <div className="relative group">
                        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-all">
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 hidden group-hover:block z-30">
                            <button onClick={() => handlePrint('session')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📄 PDF Sesión</button>
                            <button onClick={() => handlePrint('ficha_aula')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📝 PDF Ficha Aula</button>
                            <button onClick={() => handlePrint('ficha_casa')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">🏠 PDF Ficha Casa</button>
                        </div>
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
    
    // Level Specifics
    let levelPrompt = Prompts.primaria;
    if (nivel === 'Inicial') levelPrompt = Prompts.inicial;
    if (nivel === 'Secundaria') levelPrompt = Prompts.secundaria;
    
    composed += `\nEnfoque de Nivel (${nivel}): ${levelPrompt.focus}\n`;
    composed += `Materiales sugeridos: ${levelPrompt.materials}\n`;
    composed += `Tono sugerido: ${levelPrompt.tone}\n`;
    
    // Fichas
    composed += `\n${Prompts.fichas.instruction}\n`;
    
    // Specific Context
    composed += `\nCONTEXTO ESPECÍFICO:\n`;
    composed += `Nivel: ${nivel}\n`;
    composed += `Grado: ${grado}\n`;
    composed += `Área: ${area}\n`;
    composed += `PEDIDO DEL DOCENTE: "${userRequest}"\n`;
    
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
import { SessionData, SessionRequest } from "../types";
import { Type } from "@google/genai";

export class SessionGenerator {
  private static retryPolicy = new RetryPolicy();
  private static modelId = "gemini-2.5-flash";

  static async generate(request: SessionRequest): Promise<SessionData> {
    const fullPrompt = PromptComposer.compose(request);

    return this.retryPolicy.execute(async () => {
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [
            { role: 'user', parts: [{ text: fullPrompt }] }
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
    task: "Tu tarea es crear una Sesión de Aprendizaje completa y detallada.",
    style: "Usa un lenguaje pedagógico claro, empático y directo, adecuado para docentes de escuela pública.",
    structure: "La estructura debe ser estricta: Inicio, Desarrollo, Cierre.",
    constraints: [
      "Incluye materiales concretos y realistas.",
      "El campo 'teacherName' déjalo como '___________'."
    ]
  },
  inicial: {
    focus: "Enfócate en el aprendizaje a través del juego, el movimiento y la exploración sensorial.",
    materials: "Usa materiales grandes, coloridos, manipulables y seguros.",
    tone: "Muy lúdico, cariñoso y paciente."
  },
  primaria: {
    focus: "Enfócate en la construcción del conocimiento mediante material concreto y situaciones vivenciales.",
    materials: "Material estructurado y no estructurado del entorno.",
    tone: "Motivador, reflexivo y participativo."
  },
  secundaria: {
    focus: "Enfócate en el pensamiento crítico, la indagación y la autonomía.",
    materials: "Recursos tecnológicos, textos, laboratorios y organizadores visuales.",
    tone: "Retador, académico pero accesible, fomentando la ciudadanía."
  },
  fichas: {
    instruction: "Genera dos fichas de aplicación distintas: una para desarrollar en el aula (trabajo grupal o individual guiado) y otra para casa (refuerzo o extensión). Deben ser claras y listas para imprimir."
  }
};
```

## File: `prompts\prompt_fichas.json`
```json
{
  "instruction": "Genera dos fichas de aplicación distintas: una para desarrollar en el aula (trabajo grupal o individual guiado) y otra para casa (refuerzo o extensión). Deben ser claras y listas para imprimir."
}
```

## File: `prompts\prompt_inicial.json`
```json
{
  "focus": "Enfócate en el aprendizaje a través del juego, el movimiento y la exploración sensorial.",
  "materials": "Usa materiales grandes, coloridos, manipulables y seguros.",
  "tone": "Muy lúdico, cariñoso y paciente."
}
```

## File: `prompts\prompt_maestro.json`
```json
{
  "role": "Eres un experto pedagogo peruano especializado en el Currículo Nacional (CNEB).",
  "task": "Tu tarea es crear una Sesión de Aprendizaje completa y detallada.",
  "style": "Usa un lenguaje pedagógico claro, empático y directo, adecuado para docentes de escuela pública.",
  "structure": "La estructura debe ser estricta: Inicio, Desarrollo, Cierre.",
  "constraints": [
    "Incluye materiales concretos y realistas.",
    "El campo 'teacherName' déjalo como '___________'."
  ]
}
```

## File: `prompts\prompt_primaria.json`
```json
{
  "focus": "Enfócate en la construcción del conocimiento mediante material concreto y situaciones vivenciales.",
  "materials": "Material estructurado y no estructurado del entorno.",
  "tone": "Motivador, reflexivo y participativo."
}
```

## File: `prompts\prompt_secundaria.json`
```json
{
  "focus": "Enfócate en el pensamiento crítico, la indagación y la autonomía.",
  "materials": "Recursos tecnológicos, textos, laboratorios y organizadores visuales.",
  "tone": "Retador, académico pero accesible, fomentando la ciudadanía."
}
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
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas"],
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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
