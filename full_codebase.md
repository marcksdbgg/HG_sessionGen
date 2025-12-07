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
GEMINI_API_KEY = AIzaSyA2niuo0XtpyuQkiO5PewAH-VZu-a8X1SQ
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
```

## File: `components\Home.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { NIVELES, GRADOS_INICIAL, GRADOS_PRIMARIA, GRADOS_SECUNDARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData, FormatPackId } from '../types';
import { SessionGenerator } from '../core/SessionGenerator';
import { FormatPackManager } from '../core/FormatPackManager';
import { Mic, Loader2, Sparkles, History, ArrowRight, Settings2 } from 'lucide-react';

interface HomeProps {
  onSessionGenerated: (data: SessionData, formatId: string) => void;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated }) => {
  const [nivel, setNivel] = useState(NIVELES[1]);
  const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
  const [area, setArea] = useState(AREAS[0]);
  const [formatId, setFormatId] = useState<FormatPackId>('minedu');
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
        const request: SessionRequest = { nivel, grado, area, prompt, formatId };
        const data = await SessionGenerator.generate(request);
        
        const newRecord: SessionRecord = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            data,
            preview: data.sessionTitle,
            formatId: formatId
        };
        const newHistory = [newRecord, ...history].slice(0, 3);
        setHistory(newHistory);
        localStorage.setItem('aula_history', JSON.stringify(newHistory));
        
        clearInterval(interval);
        onSessionGenerated(data, formatId);
    } catch (error) {
        clearInterval(interval);
        alert("Hubo un error. Por favor intenta de nuevo.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const loadFromHistory = (record: SessionRecord) => {
      onSessionGenerated(record.data, record.formatId || 'minedu');
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
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" /> Formato de Exportación
                    </label>
                    <select value={formatId} onChange={(e) => setFormatId(e.target.value as FormatPackId)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-medium">
                        {FormatPackManager.getAllPacks().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
import { ArrowLeft, Printer, FileJson, BookOpen, GraduationCap, Clock, Home, PenSquare, RefreshCw, Save, X } from 'lucide-react';

interface SessionResultProps {
  data: SessionData;
  formatId: string;
  onBack: () => void;
}

const EditableList: React.FC<{ 
    items: string[]; 
    isEditing: boolean; 
    onChange: (newItems: string[]) => void 
}> = ({ items, isEditing, onChange }) => {
    if (isEditing) {
        return (
            <textarea 
                className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
                value={items.join('\n')}
                onChange={(e) => onChange(e.target.value.split('\n'))}
            />
        );
    }
    return (
        <ul className="text-slate-800 text-sm leading-relaxed space-y-1">
            {items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                    <span className="mr-2 text-primary">•</span>
                    <span>{item}</span>
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
}> = ({ title, icon, colorClass, onRegenerate, isLoading }) => (
    <div className={`px-6 py-3 border-b flex items-center justify-between ${colorClass}`}>
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold">{title}</h3>
        </div>
        {onRegenerate && (
            <button 
                onClick={onRegenerate}
                disabled={isLoading}
                className="p-1.5 rounded-full hover:bg-black/5 text-slate-500 hover:text-primary transition-colors"
                title="Regenerar sección"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
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
    const latex = ExportManager.generateLatex(data, formatId);
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
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isEditing ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                {isEditing ? <><Save className="w-4 h-4" /> Guardar</> : <><PenSquare className="w-4 h-4" /> Editar</>}
            </button>
            <button onClick={handleCopyLatex} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                <FileJson className={`w-5 h-5 ${copied ? 'text-green-600' : ''}`} />
            </button>
            
            <div className="relative group">
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700">
                    <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar PDF</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 p-1 hidden group-hover:block z-30">
                    <button onClick={() => handlePrint('session')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">PDF Sesión</button>
                    <button onClick={() => handlePrint('ficha_aula')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">PDF Ficha Aula</button>
                    <button onClick={() => handlePrint('ficha_casa')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">PDF Ficha Casa</button>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
        
        {/* SESSION VIEW */}
        <div className={showSession ? 'block' : 'hidden'}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{data.sessionTitle}</h1>
                <p className="text-slate-500">{data.area} • {data.cycleGrade}</p>
            </div>

            <div className="space-y-6">
                {/* INICIO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    <SectionHeader 
                        title="Inicio" 
                        icon={<Clock className="w-4 h-4" />} 
                        colorClass="bg-blue-50 text-blue-800 border-blue-100"
                        onRegenerate={isEditing ? () => handleRegenerate('inicio', 'Cambia la motivación por algo más participativo.') : undefined}
                        isLoading={regenerating === 'inicio'}
                    />
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Motivación</span>
                            <EditableList items={data.inicio.motivacion} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'motivacion', val)} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Saberes Previos</span>
                            <EditableList items={data.inicio.saberesPrevios} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'saberesPrevios', val)} />
                        </div>
                    </div>
                </div>

                {/* DESARROLLO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    <SectionHeader 
                        title="Desarrollo" 
                        icon={<BookOpen className="w-4 h-4" />} 
                        colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
                    />
                    <div className="p-6">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Estrategias</span>
                            <EditableList items={data.desarrollo.estrategias} isEditing={isEditing} onChange={(val) => updateSection('desarrollo', 'estrategias', val)} />
                        </div>
                    </div>
                </div>

                {/* CIERRE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    <SectionHeader 
                        title="Cierre" 
                        icon={<Clock className="w-4 h-4" />} 
                        colorClass="bg-slate-50 text-slate-800 border-slate-100"
                    />
                    <div className="p-6">
                        <EditableList items={data.cierre.estrategias} isEditing={isEditing} onChange={(val) => updateSection('cierre', 'estrategias', val)} />
                    </div>
                </div>
            </div>
        </div>

        {/* FICHA AULA */}
        <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
            <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-none print:p-0">
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold">Ficha de Aplicación: Aula</h2>
                    <p className="text-sm text-slate-500">{data.fichas.aula.titulo}</p>
                </div>
                <div className="space-y-4">
                    {data.fichas.aula.items.map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50 print:bg-white print:border-slate-300">
                            <div className="font-bold text-slate-400">{i+1}.</div>
                            <div className="text-slate-800">{item}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* FICHA CASA */}
        <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
             <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-none print:p-0">
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold">Ficha de Extensión: Casa</h2>
                    <p className="text-sm text-slate-500">{data.fichas.casa.titulo}</p>
                </div>
                <div className="space-y-4">
                    {data.fichas.casa.items.map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50 print:bg-white print:border-slate-300">
                            <div className="font-bold text-slate-400">{i+1}.</div>
                            <div className="text-slate-800">{item}</div>
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
import { SessionData, FormatPackId } from "../types";
import { FormatPackManager } from "./FormatPackManager";

export class ExportManager {
  private static formatList(items: string[] | undefined, latexPrefix: string = "\\item "): string {
    if (!items || items.length === 0) return "";
    return "\\begin{itemize}[leftmargin=*,nosep] " + items.map(i => `${latexPrefix}${i}`).join(" ") + " \\end{itemize}";
  }

  private static formatSimpleList(items: string[] | undefined): string {
    if (!items || items.length === 0) return "";
    return items.join(", ");
  }

  static generateLatex(data: SessionData, formatId: string): string {
    const pack = FormatPackManager.getPack(formatId);
    let tex = pack.template;

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

const LATEX_MINEDU = `\\documentclass[a4paper,11pt]{article}
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
    \\textbf{\\textit{\\small SESIÓN DE APRENDIZAJE - FORMATO MINEDU}}
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

const LATEX_COMPACTO = `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\geometry{left=1.5cm, right=1.5cm, top=1.5cm, bottom=1.5cm}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]

\\begin{document}

\\noindent \\textbf{\\large [NOMBRE_SESION]} \\hfill \\textbf{[AREA]} \\\\
\\small [CICLO_GRADO] | Docente: [DOCENTE]

\\section*{Inicio}
\\textbf{Motivación:} [MOTIVACION] \\\\
\\textbf{Saberes Previos:} [SABERES_PREVIOS] \\\\
\\textbf{Propósito:} [PROPOSITO] \\\\
\\textit{Materiales:} [MATERIALES_INICIO]

\\section*{Desarrollo}
[ESTRATEGIAS_DESARROLLO] \\\\
\\textit{Materiales:} [MATERIALES_DESARROLLO]

\\section*{Cierre}
[ESTRATEGIAS_CIERRE] \\\\
\\textit{Reflexión:} [CONFLICTO_COGNITIVO]

\\section*{Tarea}
[ACTIVIDADES_CASA]

\\end{document}`;

const LATEX_RURAL = `\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}

\\geometry{left=2.5cm, right=2.5cm, top=2.5cm, bottom=2.5cm}

\\begin{document}

\\begin{center}
    \\textbf{\\LARGE [NOMBRE_SESION]}
\\end{center}

\\vspace{0.5cm}

\\noindent \\textbf{Área:} [AREA] \\\\
\\textbf{Grado:} [CICLO_GRADO]

\\vspace{0.5cm}

\\noindent \\textbf{1. NUESTRO PROPÓSITO:} \\\\
[PROPOSITO]

\\vspace{0.5cm}

\\noindent \\textbf{2. APRENDEMOS (Inicio):} \\\\
[MOTIVACION] \\\\
[SABERES_PREVIOS]

\\vspace{0.5cm}

\\noindent \\textbf{3. CONSTRUIMOS (Desarrollo):} \\\\
[ESTRATEGIAS_DESARROLLO]

\\vspace{0.5cm}

\\noindent \\textbf{4. COMPROBAMOS (Cierre):} \\\\
[ESTRATEGIAS_CIERRE]

\\vspace{0.5cm}

\\noindent \\textbf{MATERIALES NECESARIOS:} \\\\
[MATERIALES_INICIO]
[MATERIALES_DESARROLLO]

\\end{document}`;

export const Templates = {
  minedu: LATEX_MINEDU,
  compacto: LATEX_COMPACTO,
  rural: LATEX_RURAL
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
  formatId: string;
}

export interface SessionRequest {
  nivel: string;
  grado: string;
  area: string;
  prompt: string;
  formatId: string;
}

export type FormatPackId = 'minedu' | 'compacto' | 'rural';

export interface FormatPack {
  id: FormatPackId;
  name: string;
  description: string;
  template: string;
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
