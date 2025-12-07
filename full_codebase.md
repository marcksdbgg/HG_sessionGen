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
├── index.html
├── index.tsx
├── metadata.json
├── package.json
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
import { NIVELES, GRADOS_PRIMARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData } from '../types';
import { generateSession } from '../services/geminiService';
import { Mic, Loader2, Sparkles, History, ArrowRight } from 'lucide-react';

interface HomeProps {
  onSessionGenerated: (data: SessionData) => void;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated }) => {
  const [nivel, setNivel] = useState(NIVELES[1]); // Default Primaria
  const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
  const [area, setArea] = useState(AREAS[0]);
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Generando sesión...');
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load history
    const saved = localStorage.getItem('aula_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved).slice(0, 3));
      } catch (e) {
        console.error("History load error", e);
      }
    }

    // Init Speech Recognition
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
    
    // Friendly Loading Messages cycle
    const messages = [
        "Estructurando momentos...",
        "Diseñando estrategias...",
        "Creando fichas...",
        "Finalizando detalles..."
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
        setLoadingText(messages[msgIdx % messages.length]);
        msgIdx++;
    }, 2500);

    try {
        const request: SessionRequest = { nivel, grado, area, prompt };
        const data = await generateSession(request);
        
        // Save to history
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
        alert("Hubo un error generando la sesión. Por favor intenta de nuevo.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const loadFromHistory = (record: SessionRecord) => {
      onSessionGenerated(record.data);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-lg space-y-8 mt-4 sm:mt-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-2">
                <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Aula Express
            </h1>
            <p className="text-slate-500 font-medium">
                Tu sesión de aprendizaje en segundos.
            </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
            <div className="p-6 space-y-5">
                
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nivel</label>
                        <select 
                            value={nivel} 
                            onChange={(e) => setNivel(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium"
                        >
                            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Grado</label>
                        <select 
                            value={grado} 
                            onChange={(e) => setGrado(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium"
                        >
                            {GRADOS_PRIMARIA.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Área Curricular</label>
                    <select 
                        value={area} 
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium"
                    >
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                {/* Input Area */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">¿Qué quieres enseñar hoy?</label>
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: La decena con juegos para niños, incluyendo una ficha de conteo..."
                            className="block w-full p-4 pb-12 text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent resize-none h-32 transition-all"
                        />
                        <button 
                            onClick={toggleMic}
                            className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200 ${
                                isListening 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse' 
                                : 'bg-white text-slate-400 hover:text-primary shadow-sm border border-slate-200'
                            }`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !prompt.trim()}
                    className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${
                        loading || !prompt.trim()
                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-primary hover:bg-blue-700 shadow-blue-500/30'
                    }`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                            {loadingText}
                        </>
                    ) : (
                        "Generar Sesión"
                    )}
                </button>
            </div>
        </div>

        {/* Recent History */}
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
                            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all text-left w-full"
                        >
                            <div>
                                <h3 className="font-semibold text-slate-800 line-clamp-1">{record.preview}</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {record.data.area} • {record.data.cycleGrade}
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
import { generateLatex, copyToClipboard, printSession } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, Download, BookOpen, GraduationCap, Clock, Home, CheckCircle2 } from 'lucide-react';

interface SessionResultProps {
  data: SessionData;
  onBack: () => void;
}

const DetailGroup: React.FC<{ label: string; items: string[] }> = ({ label, items }) => (
  <div className="mb-4 last:mb-0">
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
    <ul className="text-slate-800 text-sm leading-relaxed space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start">
          <span className="mr-2 text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const MaterialsSection: React.FC<{ items: string[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-2">
      <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Materiales y Recursos
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((m, i) => (
          <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-sm">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
};

const FichaCard: React.FC<{ title: string; type: 'Aula' | 'Casa'; content: FichaContent }> = ({ title, type, content }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 print:break-inside-avoid print:border-2 print:border-slate-300">
    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${type === 'Aula' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                Ficha de {type}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">{content.titulo}</h3>
        </div>
    </div>
    
    <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Instrucciones:</h4>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            {content.instrucciones.map((inst, i) => <li key={i}>{inst}</li>)}
        </ul>
    </div>

    <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Actividades:</h4>
        <div className="space-y-3">
            {content.items.map((item, i) => (
                <div key={i} className="flex items-start p-3 bg-slate-50 rounded border border-slate-100 print:bg-white print:border-slate-300">
                    <span className="font-bold text-slate-400 mr-3">{i + 1}.</span>
                    <span className="text-sm text-slate-800">{item}</span>
                </div>
            ))}
        </div>
    </div>
  </div>
);

const SessionResult: React.FC<SessionResultProps> = ({ data, onBack }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLatex = () => {
    const latex = generateLatex(data);
    copyToClipboard(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Header - Hidden on Print */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="font-medium">Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopyLatex}
            className="p-2 text-slate-600 hover:text-primary hover:bg-blue-50 rounded-full transition-colors relative"
            title="Copiar LaTeX"
          >
            {copied ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <FileJson className="w-5 h-5" />}
          </button>
          <button 
            onClick={printSession}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
        
        {/* Session Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none print:mb-4">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-3">
            Sesión de Aprendizaje
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
            {data.sessionTitle}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Área</span>
              <span className="font-medium text-slate-800">{data.area}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Ciclo/Grado</span>
              <span className="font-medium text-slate-800">{data.cycleGrade}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Docente</span>
              <span className="font-medium text-slate-800">{data.teacherName}</span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2 print:mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Secuencia Didáctica
        </h2>

        {/* Timeline */}
        <div className="relative space-y-8 pl-4 print:space-y-4 print:pl-0">
          {/* Vertical Line */}
          <div className="absolute top-4 left-[1.65rem] bottom-4 w-0.5 bg-slate-200 print:hidden"></div>

          {/* Inicio */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-slate-300">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between print:bg-slate-100">
                <h3 className="font-bold text-primary">Inicio</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-6">
                <DetailGroup label="Motivación" items={data.inicio.motivacion} />
                <DetailGroup label="Saberes Previos" items={data.inicio.saberesPrevios} />
                <DetailGroup label="Conflicto Cognitivo" items={data.inicio.conflictoCognitivo} />
                <DetailGroup label="Propósito Didáctico" items={data.inicio.propositoDidactico} />
                <MaterialsSection items={data.inicio.materiales} />
              </div>
            </div>
          </div>

          {/* Desarrollo */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-secondary shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-slate-300">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between print:bg-slate-100">
                <h3 className="font-bold text-secondary">Desarrollo</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-6">
                <DetailGroup label="Estrategias" items={data.desarrollo.estrategias} />
                <MaterialsSection items={data.desarrollo.materiales} />
              </div>
            </div>
          </div>

          {/* Cierre */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-slate-600 shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-slate-300">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between print:bg-slate-100">
                <h3 className="font-bold text-slate-700">Cierre</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-6">
                <DetailGroup label="Estrategias" items={data.cierre.estrategias} />
                <MaterialsSection items={data.cierre.materiales} />
              </div>
            </div>
          </div>

          {/* Tarea */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-green-500 shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden print:shadow-none print:border-2 print:border-green-300">
              <div className="bg-green-50 px-6 py-3 border-b border-green-100 flex items-center justify-between print:bg-green-100">
                <h3 className="font-bold text-green-700">Tarea en Casa</h3>
                <Home className="w-4 h-4 text-green-600" />
              </div>
              <div className="p-6">
                <DetailGroup label="Actividades de Extensión" items={data.tareaCasa.actividades} />
                <MaterialsSection items={data.tareaCasa.materiales} />
              </div>
            </div>
          </div>
        </div>

        <div className="page-break"></div>

        <h2 className="text-lg font-bold text-slate-800 mt-12 mb-4 px-1 flex items-center gap-2 print:mt-8">
            <GraduationCap className="w-5 h-5 text-primary" />
            Fichas de Aplicación
        </h2>

        <FichaCard title={data.fichas.aula.titulo} type="Aula" content={data.fichas.aula} />
        
        <div className="print:mt-8"></div>
        
        <FichaCard title={data.fichas.casa.titulo} type="Casa" content={data.fichas.casa} />
        
        {/* Footer info for print */}
        <div className="hidden print:block mt-8 text-center text-xs text-slate-400">
            Generado con Aula Express • {new Date().toLocaleDateString()}
        </div>

      </div>
    </div>
  );
};

export default SessionResult;
```

## File: `constants.ts`
```ts
export const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];
export const GRADOS_PRIMARIA = ['1°', '2°', '3°', '4°', '5°', '6°'];
export const AREAS = ['Matemática', 'Comunicación', 'Personal Social', 'Ciencia y Tecnología', 'Arte y Cultura', 'Religión', 'Educación Física'];

export const LATEX_TEMPLATE = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{tabularx}
\\usepackage{multirow}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{graphicx}

\\geometry{left=2cm, right=2cm, top=2cm, bottom=2cm}

\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\renewcommand{\\arraystretch}{1.4}

\\begin{document}

\\begin{center}
    \\textbf{\\Large [NOMBRE DE LA SESIÓN]}\\\\[0.2cm]
    \\textbf{\\textit{\\small SESIÓN DE APRENDIZAJE}}
\\end{center}

\\vspace{0.3cm}

\\noindent \\textbf{I. \\hspace{0.3cm} DATOS INFORMATIVOS:}

\\vspace{0.2cm}

\\noindent
\\begin{tabular}{ll}
    \\textbf{1.1 Área Curricular} & : [Área Curricular] \\\\
    \\textbf{1.2 Ciclo -- Grado}  & : [Ciclo -- Grado] \\\\
    \\textbf{1.3 Docente}         & : [Nombre del Docente] \\\\
\\end{tabular}

\\vspace{0.5cm}

\\noindent \\textbf{II. \\hspace{0.1cm} SECUENCIA DIDÁCTICA DE LA SESIÓN}

\\vspace{0.2cm}

\\noindent
\\begin{tabularx}{\\textwidth}{|p{2cm}|p{3cm}|L|p{3cm}|}
    \\hline
    \\multicolumn{2}{|c|}{\\textbf{Momentos}} & \\multicolumn{1}{c|}{\\textbf{Estrategias}} & \\multicolumn{1}{c|}{\\textbf{Materiales}} \\\\
    \\hline

    \\multirow{4}{*}{\\textbf{Inicio}} 
    & \\textbf{Motivación} 
    & [Estrategias de Motivación]
    & \\multirow{4}{*}{\\parbox{\\linewidth}{
        [Materiales]
    }} \\\\
    \\cline{2-3}

    & \\textbf{Saberes previos} 
    & [Saberes Previos]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Conflicto cognitivo} 
    & [Conflicto Cognitivo]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Propósito didáctico} 
    & [Propósito Didáctico]
    & \\\\ 
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Desarrollo}} 
    & [Estrategias de Desarrollo]
    & [Materiales] \\\\
    \\hline
    \\multicolumn{2}{|l|}{\\textbf{Cierre}} 
    & [Estrategias de Cierre]
    & [Materiales] \\\\
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Tarea o trabajo en casa}} 
    & [Tarea o Trabajo en Casa]
    & [Materiales] \\\\
    \\hline

\\end{tabularx}

\\end{document}`;
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

## File: `services\exportService.ts`
```ts
import { SessionData } from "../types";
import { LATEX_TEMPLATE } from "../constants";

function formatList(items: string[] | undefined, prefix: string = ""): string {
  if (!items || items.length === 0) return "";
  // For LaTeX, simple newlines or itemize if we want to be fancy. 
  // Given the template puts them in a table cell, bullet points are best.
  return "\\begin{itemize}[leftmargin=*,nosep] " + items.map(i => `\\item ${prefix}${i}`).join(" ") + " \\end{itemize}";
}

function formatTextList(items: string[] | undefined): string {
  if (!items || items.length === 0) return "";
  return items.join("\n• ");
}

export function generateLatex(data: SessionData): string {
  let tex = LATEX_TEMPLATE;

  // Replacements
  tex = tex.replace("[NOMBRE DE LA SESIÓN]", data.sessionTitle);
  tex = tex.replace("[Área Curricular]", data.area);
  tex = tex.replace("[Ciclo -- Grado]", data.cycleGrade);
  tex = tex.replace("[Nombre del Docente]", data.teacherName);

  // Inicio
  tex = tex.replace("[Estrategias de Motivación]", formatList(data.inicio.motivacion));
  tex = tex.replace("[Saberes Previos]", formatList(data.inicio.saberesPrevios));
  tex = tex.replace("[Conflicto Cognitivo]", formatList(data.inicio.conflictoCognitivo));
  tex = tex.replace("[Propósito Didáctico]", formatList(data.inicio.propositoDidactico));
  
  // Materials (Grouped for the side column in table)
  // We combine materials from Inicio to put in the side column first row, but the template 
  // has [Materiales] in multiple places. The request says "materials" is a list.
  // We will distribute materials relevant to each section if possible, or repeat general ones.
  // The JSON schema has materials per section.
  
  tex = tex.replace("[Materiales]", formatList(data.inicio.materiales)); // First occurrence (Inicio)
  
  // Desarrollo
  tex = tex.replace("[Estrategias de Desarrollo]", formatList(data.desarrollo.estrategias));
  // Note: The template has a second [Materiales] in Desarrollo row.
  // String.replace only replaces the first occurrence unless regex global flag is used.
  // However, we want to target specific placeholders. We should have unique placeholders 
  // or rely on order. Since the template uses exact strings, let's use a robust sequential replace.
  
  // To avoid replacing the wrong [Materiales], we can split the template or use a cursor. 
  // But simpler: the JS replace(string, val) replaces the FIRST occurrence. 
  // We already replaced the first [Materiales] above (for Inicio).
  // Now we replace the next one.
  
  tex = tex.replace("[Materiales]", formatList(data.desarrollo.materiales)); // Second occurrence (Desarrollo)
  
  // Cierre
  tex = tex.replace("[Estrategias de Cierre]", formatList(data.cierre.estrategias));
  tex = tex.replace("[Materiales]", formatList(data.cierre.materiales)); // Third occurrence (Cierre)

  // Tarea
  tex = tex.replace("[Tarea o Trabajo en Casa]", formatList(data.tareaCasa.actividades));
  tex = tex.replace("[Materiales]", formatList(data.tareaCasa.materiales)); // Fourth occurrence (Tarea)

  return tex;
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function printSession() {
  window.print();
}
```

## File: `services\geminiService.ts`
```ts
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SessionData, SessionRequest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SESSION_SCHEMA: Schema = {
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

export async function generateSession(request: SessionRequest): Promise<SessionData> {
  const modelId = "gemini-2.5-flash"; // Fast and capable of structured output
  
  const systemPrompt = `
    Eres un experto pedagogo peruano especializado en el Currículo Nacional (CNEB).
    Tu tarea es crear una Sesión de Aprendizaje completa y detallada.
    
    Reglas:
    1. Usa un lenguaje pedagógico claro, empático y directo, adecuado para docentes.
    2. La estructura debe ser estricta: Inicio, Desarrollo, Cierre.
    3. Incluye materiales concretos y realistas para escuelas públicas.
    4. Genera dos fichas de aplicación (una para aula y otra para casa).
    5. El campo 'teacherName' déjalo como '___________'.
    6. Adapta el contenido al Nivel: ${request.nivel}, Grado: ${request.grado} y Área: ${request.area}.
  `;

  const userPrompt = `Solicitud del docente: "${request.prompt}"`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: SESSION_SCHEMA,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    return JSON.parse(jsonText) as SessionData;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
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
